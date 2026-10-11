import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { AiGagal, tanyaJson, type Penyedia } from "@/lib/ai";
import {
  amanDisimpan,
  ambilKonteks,
  hariIni,
  INSTRUKSI_TANYA,
  kunciCache,
  sidik,
  type Konteks,
} from "@/lib/tanya";

export const runtime = "nodejs";
export const maxDuration = 60;

const Skema = z.object({
  pertanyaan: z.string().trim().min(3).max(300),
  token: z.string().max(4096).default(""),
});

const angka = (v: string | undefined, bawaan: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : bawaan;
};

const BATAS_PENGUNJUNG = angka(process.env.TANYA_BATAS_PENGUNJUNG, 15);
const BATAS_HARIAN = angka(process.env.TANYA_BATAS_HARIAN, 150);
const JEDA_MS = 8000;
const UMUR_CACHE_MS = 7 * 24 * 3600_000;

const kirim = (pesan: string, status: number) =>
  NextResponse.json({ error: pesan }, { status });

function urutanTanya(): Penyedia[] {
  const d = (process.env.TANYA_URUTAN ?? "gemini")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((x): x is Penyedia => x === "gemini" || x === "openrouter");
  return d.length ? d : ["gemini"];
}

async function verifikasiTurnstile(token: string, ip: string) {
  const rahasia = process.env.TURNSTILE_SECRET_KEY;
  if (!rahasia) return process.env.NODE_ENV !== "production"; // saat pengembangan boleh dilewati
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret: rahasia, response: token });
    if (ip) form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const j = await res.json();
    return j?.success === true;
  } catch {
    return false;
  }
}

async function periksaBatas(id: string) {
  const ref = adminDb.collection("tanya_batas").doc(id);
  return adminDb.runTransaction(async (t) => {
    const d = await t.get(ref);
    const n = Number(d.data()?.n ?? 0);
    const terakhir = Number(d.data()?.terakhir ?? 0);
    const sekarang = Date.now();
    if (n >= BATAS_PENGUNJUNG) return "harian" as const;
    if (sekarang - terakhir < JEDA_MS) return "jeda" as const;
    t.set(ref, { n: n + 1, terakhir: sekarang }, { merge: true });
    return "ok" as const;
  });
}

function sumberDari(slugs: string[], k: Konteks) {
  return slugs
    .filter((s) => k.slugs.has(s))
    .slice(0, 3)
    .map((slug) => ({ slug, judul: k.slugs.get(slug) ?? slug }));
}

async function tangani(req: Request) {
  if (process.env.TANYA_AKTIF === "false") {
    return kirim("Fitur tanya jawab sedang dinonaktifkan.", 503);
  }
  if (process.env.NODE_ENV === "production" && !process.env.TURNSTILE_SECRET_KEY) {
    return kirim("Layanan belum dikonfigurasi.", 503);
  }

  const parsed = Skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return kirim("Pertanyaan harus 3 sampai 300 karakter.", 400);

  // Buang tanda kurung sudut supaya pertanyaan tidak bisa menutup penanda <PERTANYAAN>
  const pertanyaan = parsed.data.pertanyaan.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim();
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "lokal";

  if (!(await verifikasiTurnstile(parsed.data.token, ip === "lokal" ? "" : ip))) {
    return kirim("Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.", 400);
  }

  const hari = hariIni();
  const batas = await periksaBatas(`${hari}_${sidik(ip)}`);
  if (batas === "jeda") return kirim("Terlalu cepat. Tunggu beberapa detik lalu coba lagi.", 429);
  if (batas === "harian") {
    return kirim("Batas pertanyaanmu hari ini sudah habis. Coba lagi besok.", 429);
  }

  const k = await ambilKonteks();

  // Cache: pertanyaan yang sama dengan isi situs yang sama tidak perlu memanggil AI
  const cRef = adminDb.collection("tanya_cache").doc(kunciCache(pertanyaan, k.versi));
  const c = await cRef.get();
  if (c.exists && Date.now() - Number(c.data()?.dibuat ?? 0) < UMUR_CACHE_MS) {
    const sumber = Array.isArray(c.data()?.sumber) ? (c.data()!.sumber as string[]) : [];
    return NextResponse.json({
      jawaban: String(c.data()?.jawaban ?? ""),
      sumber: sumberDari(sumber, k),
      dari: "cache",
    });
  }

  // Batas harian keseluruhan untuk panggilan AI
  const gRef = adminDb.collection("tanya_batas").doc(`global_${hari}`);
  const g = await gRef.get();
  if (Number(g.data()?.n ?? 0) >= BATAS_HARIAN) {
    return kirim("Asisten sudah mencapai batas pemakaian hari ini. Coba lagi besok.", 429);
  }
  await gRef.set({ n: FieldValue.increment(1) }, { merge: true });

  let hasil;
  try {
    hasil = await tanyaJson(
      INSTRUKSI_TANYA,
      `<KONTEN>\n${k.teks}\n</KONTEN>\n\n<PERTANYAAN>\n${pertanyaan}\n</PERTANYAAN>`,
      {
        urutan: urutanTanya(),
        valid: (x) => {
          const j = (x as { jawaban?: unknown } | null)?.jawaban;
          return typeof j === "string" && j.trim().length > 0;
        },
      }
    );
  } catch (e) {
    if (e instanceof AiGagal && e.kode === "kuota") {
      return kirim("Asisten sedang penuh. Coba lagi beberapa menit lagi.", 429);
    }
    return kirim("Asisten sedang tidak bisa menjawab. Coba lagi nanti.", 503);
  }

  const data = hasil.data as { jawaban: string; sumber?: unknown };
  const jawaban = data.jawaban.trim().slice(0, 900);
  const slugDipakai = Array.isArray(data.sumber)
    ? data.sumber.filter((s): s is string => typeof s === "string" && k.slugs.has(s))
    : [];

  // Yang disimpan hanya jawaban, bukan teks pertanyaan
  if (amanDisimpan(pertanyaan)) {
    await cRef
      .set({ jawaban, sumber: slugDipakai.slice(0, 3), dibuat: Date.now() })
      .catch(() => {});
  }

  return NextResponse.json({
    jawaban,
    sumber: sumberDari(slugDipakai, k),
    dari: "ai",
  });
}

export async function POST(req: Request) {
  try {
    return await tangani(req);
  } catch (e) {
    console.error("[TANYA]", e instanceof Error ? e.message : e);
    return kirim("Terjadi kesalahan di server. Coba lagi nanti.", 500);
  }
}
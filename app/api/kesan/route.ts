import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { hariIni, sidik } from "@/lib/tanya";
import { ambilIp, verifikasiTurnstile } from "@/lib/manusia";
import { BATAS_PER_HARI, JEDA_MS, KesanSchema, bersihkan, perluTinjau } from "@/lib/kesanAturan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const kirim = (pesan: string, status: number) => NextResponse.json({ error: pesan }, { status });

// Publik: hanya pesan yang sudah disetujui (punya tampilPada), terbaru dulu
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const batas = Math.min(50, Math.max(1, Number(q.get("batas")) || 12));
    const sebelum = Number(q.get("sebelum")) || 0;

    let kueri = adminDb.collection("kesan").orderBy("tampilPada", "desc");
    if (sebelum > 0) kueri = kueri.startAfter(Timestamp.fromMillis(sebelum));
    const snap = await kueri.limit(batas + 1).get();

    const semua = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        nama: String(x.nama ?? "") || "Pengunjung",
        asal: String(x.asal ?? ""),
        pesan: String(x.pesan ?? ""),
        waktu: x.tampilPada?.toMillis?.() ?? 0,
      };
    });
    const daftar = semua.slice(0, batas);
    return NextResponse.json(
      { daftar, lagi: semua.length > batas, berikut: daftar.length ? daftar[daftar.length - 1].waktu : 0 },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
    );
  } catch {
    return kirim("Gagal memuat pesan.", 500);
  }
}

async function periksaBatas(id: string) {
  const ref = adminDb.collection("kesan_batas").doc(id);
  return adminDb.runTransaction(async (t) => {
    const d = await t.get(ref);
    const n = Number(d.data()?.n ?? 0);
    const terakhir = Number(d.data()?.terakhir ?? 0);
    const sekarang = Date.now();
    if (n >= BATAS_PER_HARI) return "harian" as const;
    if (sekarang - terakhir < JEDA_MS) return "jeda" as const;
    t.set(ref, { n: n + 1, terakhir: sekarang }, { merge: true });
    return "ok" as const;
  });
}

async function tangani(req: Request) {
  if (process.env.KESAN_AKTIF === "false") return kirim("Pengiriman pesan sedang dinonaktifkan.", 503);
  if (process.env.NODE_ENV === "production" && !process.env.TURNSTILE_SECRET_KEY) {
    return kirim("Layanan belum dikonfigurasi.", 503);
  }

  const p = KesanSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return kirim("Pesan harus 5 sampai 300 karakter.", 400);

  // Kolom jebakan terisi: kemungkinan bot. Pura-pura berhasil, tanpa menyimpan apa pun.
  if (p.data.situs) return NextResponse.json({ ok: true, status: "menunggu" });

  const ip = ambilIp(req);
  if (!(await verifikasiTurnstile(p.data.token, ip))) {
    return kirim("Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.", 400);
  }

  const batas = await periksaBatas(`${hariIni()}_${sidik(ip)}`);
  if (batas === "jeda") return kirim("Terlalu cepat. Tunggu beberapa detik lalu coba lagi.", 429);
  if (batas === "harian") return kirim("Batas pesanmu hari ini sudah habis. Coba lagi besok.", 429);

  const nama = bersihkan(p.data.nama).slice(0, 40);
  const asal = bersihkan(p.data.asal).slice(0, 60);
  const pesan = bersihkan(p.data.pesan).slice(0, 300);
  if (pesan.length < 5) return kirim("Pesan terlalu pendek.", 400);

  const alasan = perluTinjau(`${nama} ${asal} ${pesan}`);
  const langsung = process.env.KESAN_OTOMATIS === "true" && !alasan;

  await adminDb.collection("kesan").add({
    nama,
    asal,
    pesan,
    status: langsung ? "tampil" : "menunggu",
    tinjau: alasan ?? "",
    dibuat: FieldValue.serverTimestamp(),
    ...(langsung ? { tampilPada: FieldValue.serverTimestamp() } : {}),
  });
  return NextResponse.json({ ok: true, status: langsung ? "tampil" : "menunggu" });
}

export async function POST(req: Request) {
  try {
    return await tangani(req);
  } catch (e) {
    console.error("[KESAN]", e instanceof Error ? e.message : e);
    return kirim("Terjadi kesalahan di server. Coba lagi nanti.", 500);
  }
}
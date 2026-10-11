import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { tanyaGemini } from "./gemini";
import { tanyaOpenRouter } from "./openrouter";
import { GalatHttp, pesanDari, statusDari } from "./aiBantu";

export type Penyedia = "gemini" | "openrouter";
export type Rincian = { penyedia: Penyedia; status?: number; pesan: string };

const BATAS_MS = 25_000; // batas waktu per penyedia
const TAHAN_429_MS = 60_000; // penyedia yang baru kena batas kuota dilewati selama ini

const DAFTAR: Record<
  Penyedia,
  {
    siap: () => boolean;
    model: () => string;
    panggil: (instruksi: string, isi: string) => Promise<unknown>;
  }
> = {
  gemini: {
    siap: () => !!process.env.GEMINI_API_KEY,
    model: () => process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
    panggil: tanyaGemini,
  },
  openrouter: {
    siap: () => !!process.env.OPENROUTER_API_KEY && !!process.env.OPENROUTER_MODEL,
    model: () => process.env.OPENROUTER_MODEL ?? "",
    panggil: tanyaOpenRouter,
  },
};

// Catatan sementara per instance server (hanya perkiraan, hilang kalau server di-restart)
const tertahan = new Map<Penyedia, number>();

export class AiGagal extends Error {
  kode: "tidak-ada-penyedia" | "kuota" | "gagal";
  rincian: Rincian[];
  constructor(kode: AiGagal["kode"], rincian: Rincian[], pesan: string) {
    super(pesan);
    this.kode = kode;
    this.rincian = rincian;
  }
}

function urutan(): Penyedia[] {
  const hasil = (process.env.AI_URUTAN ?? "gemini,openrouter")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((x): x is Penyedia => x === "gemini" || x === "openrouter");
  return hasil.length ? hasil : ["gemini", "openrouter"];
}

function batasWaktu<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new GalatHttp(504, "Melewati batas waktu.")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

// Tanggal menurut WIB
function hariIni() {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

async function catatPakai(p: Penyedia, ok: boolean) {
  try {
    await adminDb
      .collection("ai_pakai")
      .doc(hariIni())
      .set(
        {
          [p]: {
            coba: FieldValue.increment(1),
            ...(ok ? { ok: FieldValue.increment(1) } : {}),
          },
        },
        { merge: true }
      );
  } catch {
    /* pencatatan tidak boleh menggagalkan permintaan */
  }
}

async function melebihiBatasHarian(p: Penyedia) {
  if (p !== "openrouter") return false;
  const batas = Number(process.env.OPENROUTER_BATAS_HARIAN ?? 0);
  if (!batas) return false;
  try {
    const d = await adminDb.collection("ai_pakai").doc(hariIni()).get();
    return Number(d.data()?.openrouter?.coba ?? 0) >= batas;
  } catch {
    return false;
  }
}

// Coba tiap penyedia SATU kali, berurutan. Berhenti di yang pertama berhasil.
export async function tanyaJson(
  instruksi: string,
  isi: string,
  opsi: { valid?: (data: unknown) => boolean; urutan?: Penyedia[] } = {}
): Promise<{ data: unknown; penyedia: Penyedia }> {
  const rincian: Rincian[] = [];
  let adaSiap = false;

  for (const p of opsi.urutan ?? urutan()) {
    const d = DAFTAR[p];
    if (!d.siap()) continue;
    adaSiap = true;

    if (Date.now() < (tertahan.get(p) ?? 0)) {
      rincian.push({ penyedia: p, status: 429, pesan: "Dilewati sementara karena baru kena batas kuota." });
      continue;
    }
    if (await melebihiBatasHarian(p)) {
      rincian.push({ penyedia: p, status: 429, pesan: "Dilewati: batas harian yang kamu tetapkan tercapai." });
      continue;
    }

    try {
      const data = await batasWaktu(d.panggil(instruksi, isi), BATAS_MS);
      if (opsi.valid && !opsi.valid(data)) throw new Error("Bentuk jawaban tidak sesuai.");
      await catatPakai(p, true);
      return { data, penyedia: p };
    } catch (e) {
      const st = statusDari(e);
      if (st === 429) tertahan.set(p, Date.now() + TAHAN_429_MS);
      console.error("[AI]", p, st ?? "-", pesanDari(e));
      rincian.push({ penyedia: p, status: st, pesan: pesanDari(e) });
      await catatPakai(p, false);
    }
  }

  if (!adaSiap) {
    throw new AiGagal("tidak-ada-penyedia", [], "Belum ada penyedia AI yang dikonfigurasi.");
  }
  const semuaKuota = rincian.length > 0 && rincian.every((r) => r.status === 429);
  throw new AiGagal(
    semuaKuota ? "kuota" : "gagal",
    rincian,
    semuaKuota ? "Kuota semua penyedia AI habis." : "Semua penyedia AI gagal menjawab."
  );
}

/* ---------- Untuk halaman Status AI ---------- */

export function statusPenyedia() {
  return {
    urutan: urutan(),
    penyedia: (Object.keys(DAFTAR) as Penyedia[]).map((p) => ({
      nama: p,
      siap: DAFTAR[p].siap(),
      model: DAFTAR[p].model(),
    })),
  };
}

export async function ambilPakai() {
  const kosong = { coba: 0, ok: 0 };
  try {
    const d = (await adminDb.collection("ai_pakai").doc(hariIni()).get()).data() ?? {};
    const baca = (p: Penyedia) => ({
      coba: Number(d[p]?.coba ?? 0),
      ok: Number(d[p]?.ok ?? 0),
    });
    return { tanggal: hariIni(), gemini: baca("gemini"), openrouter: baca("openrouter") };
  } catch {
    return { tanggal: hariIni(), gemini: kosong, openrouter: kosong };
  }
}

// Tes satu penyedia secara langsung (tanpa cadangan)
export async function tesPenyedia(p: Penyedia) {
  const d = DAFTAR[p];
  if (!d.siap()) {
    return { ok: false, ms: 0, pesan: "Belum dikonfigurasi (kunci atau model kosong)." };
  }
  const mulai = Date.now();
  try {
    const data = await batasWaktu(d.panggil('Balas hanya dengan JSON {"ok":true}', "tes"), BATAS_MS);
    await catatPakai(p, true);
    return {
      ok: true,
      ms: Date.now() - mulai,
      pesan: `Berhasil. Jawaban: ${JSON.stringify(data).slice(0, 80)}`,
    };
  } catch (e) {
    await catatPakai(p, false);
    return {
      ok: false,
      ms: Date.now() - mulai,
      pesan: `${statusDari(e) ?? ""} ${pesanDari(e)}`.trim(),
    };
  }
}
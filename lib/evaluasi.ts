import { z } from "zod";
import { ID_RE } from "./detail";

export const DETIK_UJI = 8; // batas waktu tiap percobaan
export const DETIK_JEDA = 2; // jeda antar percobaan, event di masa ini diabaikan

/* ---------- Format data ---------- */

export const TrialSchema = z.object({
  target: z.string().regex(ID_RE),
  hasil: z.string().regex(ID_RE).nullable(),
  skor: z.number().min(0).max(100).nullable(),
  ms: z.number().int().min(0).max(120000).nullable(),
});

export const SesiSchema = z.object({
  penguji: z.string().regex(/^[A-Za-z0-9_-]{1,20}$/),
  kondisi: z.string().trim().max(200),
  simulasi: z.boolean(),
  trials: z.array(TrialSchema).min(1).max(600),
});

export type Trial = z.infer<typeof TrialSchema>;
export type SesiData = z.infer<typeof SesiSchema>;

/* ---------- Statistik ---------- */

// Rentang kepercayaan Wilson (95%): jujur untuk jumlah percobaan yang kecil
export function wilson(benar: number, n: number, z = 1.96): [number, number] {
  if (n <= 0) return [0, 0];
  const p = benar / n;
  const d = 1 + (z * z) / n;
  const pusat = (p + (z * z) / (2 * n)) / d;
  const lebar = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, pusat - lebar), Math.min(1, pusat + lebar)];
}

export function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Persentil nearest-rank
export function persentil(a: number[], p: number): number {
  const s = [...a].sort((x, y) => x - y);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i];
}

const rata = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

export type StatSign = {
  id: string;
  n: number;
  benar: number;
  tidakTerdeteksi: number;
  akurasi: number;
  ciBawah: number;
  ciAtas: number;
  skorRata: number | null;
  latensiMedian: number | null;
  latensiP90: number | null;
  tertukar: { id: string; jumlah: number }[];
};

export type Statistik = {
  totalTrial: number;
  benar: number;
  akurasi: number;
  ciBawah: number;
  ciAtas: number;
  sesi: number;
  penguji: number;
  perSign: StatSign[];
  kondisi: string[];
};

// Skor dan waktu hanya dihitung untuk deteksi yang benar.
// Sesi simulasi tidak ikut kecuali diminta (hanya untuk pengembangan).
export function hitungStatistik(
  sesi: SesiData[],
  opsi: { termasukSimulasi?: boolean } = {}
): Statistik {
  const dipakai = sesi.filter((s) => opsi.termasukSimulasi || !s.simulasi);

  type G = {
    n: number;
    benar: number;
    tidak: number;
    skor: number[];
    ms: number[];
    salah: Map<string, number>;
  };
  const peta = new Map<string, G>();
  let total = 0;
  let benarTotal = 0;

  for (const s of dipakai) {
    for (const t of s.trials) {
      total++;
      const g: G = peta.get(t.target) ?? { n: 0, benar: 0, tidak: 0, skor: [], ms: [], salah: new Map() };
      g.n++;
      if (t.hasil === null) {
        g.tidak++;
      } else if (t.hasil === t.target) {
        g.benar++;
        benarTotal++;
        if (t.skor !== null) g.skor.push(t.skor);
        if (t.ms !== null) g.ms.push(t.ms);
      } else {
        g.salah.set(t.hasil, (g.salah.get(t.hasil) ?? 0) + 1);
      }
      peta.set(t.target, g);
    }
  }

  const perSign: StatSign[] = [...peta.entries()].map(([id, g]) => {
    const [lo, hi] = wilson(g.benar, g.n);
    return {
      id,
      n: g.n,
      benar: g.benar,
      tidakTerdeteksi: g.tidak,
      akurasi: g.benar / g.n,
      ciBawah: lo,
      ciAtas: hi,
      skorRata: g.skor.length ? rata(g.skor) : null,
      latensiMedian: g.ms.length ? median(g.ms) : null,
      latensiP90: g.ms.length ? persentil(g.ms, 90) : null,
      tertukar: [...g.salah.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tid, jumlah]) => ({ id: tid, jumlah })),
    };
  });

  const [lo, hi] = wilson(benarTotal, total);
  return {
    totalTrial: total,
    benar: benarTotal,
    akurasi: total ? benarTotal / total : 0,
    ciBawah: lo,
    ciAtas: hi,
    sesi: dipakai.length,
    penguji: new Set(dipakai.map((s) => s.penguji)).size,
    perSign,
    kondisi: [...new Set(dipakai.map((s) => s.kondisi).filter(Boolean))],
  };
}

/* ---------- Antrean dan mesin sesi ---------- */

// Tiap isyarat muncul sebanyak "ulangan" kali, tidak pernah dua kali berturut-turut
// (selama ada minimal dua isyarat)
export function buatAntrean(ids: string[], ulangan: number): string[] {
  const sisa = new Map(ids.map((id) => [id, ulangan]));
  const hasil: string[] = [];
  let terakhir = "";
  const total = ids.length * ulangan;

  while (hasil.length < total) {
    const aktif = [...sisa.entries()].filter(([, n]) => n > 0);
    const bukanTerakhir = aktif.filter(([id]) => id !== terakhir);
    const pool = bukanTerakhir.length ? bukanTerakhir : aktif;
    const maks = Math.max(...pool.map(([, n]) => n));
    const kandidat = pool.filter(([, n]) => n === maks).map(([id]) => id);
    const id = kandidat[Math.floor(Math.random() * kandidat.length)];
    hasil.push(id);
    sisa.set(id, (sisa.get(id) ?? 1) - 1);
    terakhir = id;
  }
  return hasil;
}

export type Sesi = {
  fase: "idle" | "uji" | "jeda" | "selesai";
  antrean: string[];
  pos: number;
  trials: Trial[];
  mulaiMs: number;
  sisa: number;
  simulasi: boolean;
};

export const SESI_AWAL: Sesi = {
  fase: "idle",
  antrean: [],
  pos: 0,
  trials: [],
  mulaiMs: 0,
  sisa: 0,
  simulasi: false,
};

export type AksiSesi =
  | { tipe: "mulai"; antrean: string[]; sekarang: number }
  | { tipe: "event"; sign_id: string; skor: number | null; simulasi: boolean; sekarang: number }
  | { tipe: "tick"; sekarang: number }
  | { tipe: "batal" };

function catat(s: Sesi, t: Trial, simulasi: boolean): Sesi {
  const pos = s.pos + 1;
  const habis = pos >= s.antrean.length;
  return {
    ...s,
    trials: [...s.trials, t],
    pos,
    simulasi: s.simulasi || simulasi,
    fase: habis ? "selesai" : "jeda",
    sisa: habis ? 0 : DETIK_JEDA,
  };
}

export function reduksiSesi(s: Sesi, a: AksiSesi): Sesi {
  switch (a.tipe) {
    case "mulai":
      return { ...SESI_AWAL, fase: "uji", antrean: a.antrean, mulaiMs: a.sekarang, sisa: DETIK_UJI };

    case "batal":
      return SESI_AWAL;

    case "event": {
      // Deteksi pertama dalam satu percobaan yang dihitung. Event saat jeda diabaikan.
      if (s.fase !== "uji") return s;
      return catat(
        s,
        {
          target: s.antrean[s.pos],
          hasil: a.sign_id,
          skor: a.skor,
          ms: Math.max(0, a.sekarang - s.mulaiMs),
        },
        a.simulasi
      );
    }

    case "tick": {
      if (s.fase === "uji") {
        const sisa = s.sisa - 1;
        if (sisa > 0) return { ...s, sisa };
        return catat(s, { target: s.antrean[s.pos], hasil: null, skor: null, ms: null }, false);
      }
      if (s.fase === "jeda") {
        const sisa = s.sisa - 1;
        if (sisa > 0) return { ...s, sisa };
        return { ...s, fase: "uji", sisa: DETIK_UJI, mulaiMs: a.sekarang };
      }
      return s;
    }
  }
}
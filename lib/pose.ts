import { SENSOR_KEYS, SENSOR_RANGE, type Sample, type SensorKey } from "./schema";
import type { Bahasa } from "./bahasa";

export type Kondisi = { sensor: SensorKey; min: number; max: number };

export type StaticRule = {
  sign_id: string;
  teks: string;
  bahasa?: Bahasa;
  durasi_tahan_ms: number;
  kondisi: Kondisi[];
  audio_url?: string | null;
};

/* ---------- Kunci sensor lama (hanya tangan kanan) ---------- */
const KUNCI_LAMA = new Set([
  "IBU_JARI",
  "TELUNJUK",
  "TENGAH",
  "MANIS",
  "KELINGKING",
  "PITCH",
  "ROLL",
]);

// Kunci lama (tanpa awalan) dianggap tangan kanan
export function normSensor(k: string): SensorKey | null {
  if ((SENSOR_KEYS as readonly string[]).includes(k)) return k as SensorKey;
  if (KUNCI_LAMA.has(k)) return `R_${k}` as SensorKey;
  return null;
}

export function normKondisi(daftar: unknown): Kondisi[] {
  if (!Array.isArray(daftar)) return [];
  const hasil: Kondisi[] = [];
  for (const c of daftar) {
    const sensor = normSensor(String(c?.sensor));
    const min = Number(c?.min);
    const max = Number(c?.max);
    if (sensor && Number.isFinite(min) && Number.isFinite(max)) {
      hasil.push({ sensor, min, max });
    }
  }
  return hasil;
}

/* ---------- Jenis tangan ---------- */
export type JenisTangan = "kanan" | "kiri" | "dua";

export const LABEL_TANGAN: Record<JenisTangan, string> = {
  kanan: "Tangan kanan",
  kiri: "Tangan kiri",
  dua: "Dua tangan",
};

export function jenisTangan(kondisi: Kondisi[]): JenisTangan | null {
  const r = kondisi.some((c) => c.sensor.startsWith("R_"));
  const l = kondisi.some((c) => c.sensor.startsWith("L_"));
  if (r && l) return "dua";
  if (r) return "kanan";
  if (l) return "kiri";
  return null;
}

/* ---------- Menghitung batas dari rekaman ---------- */
// Hanya sensor yang ada di SEMUA sampel yang dihitung. Batas = rata-rata ± (2 x simpangan baku),
// dengan margin minimal 5% dari rentang sensor.
export function hitungKondisi(samples: Sample[], faktor = 1): Kondisi[] {
  const hasil: Kondisi[] = [];
  if (samples.length === 0) return hasil;

  for (const sensor of SENSOR_KEYS) {
    const v: number[] = [];
    for (const s of samples) {
      const x = s[sensor];
      if (typeof x === "number") v.push(x);
    }
    if (v.length !== samples.length) continue;

    const [lo, hi] = SENSOR_RANGE[sensor];
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const std = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
        const margin = Math.max(2 * std, 0.05 * (hi - lo)) * Math.min(3, Math.max(0.25, faktor));
    hasil.push({
      sensor,
      min: Math.round(Math.max(lo, mean - margin)),
      max: Math.round(Math.min(hi, mean + margin)),
    });
  }
  return hasil;
}

/* ---------- Pencocokan (logika yang sama dipakai master di ESP32) ---------- */
// Kalau "bahasa" diberikan, hanya aturan bahasa itu yang dipertimbangkan.
// Sensor yang tidak ada di sampel (misalnya tangan kiri terputus) membuat aturan itu tidak cocok.
// Kalau beberapa aturan cocok, menang yang kondisinya paling banyak (paling spesifik).
export function cocokkanPose(
  sample: Sample,
  rules: StaticRule[],
  bahasa?: Bahasa
): StaticRule | null {
  const hits = rules.filter((r) => {
    if (bahasa && (r.bahasa ?? "SIBI") !== bahasa) return false;
    return r.kondisi.every((c) => {
      const v = sample[c.sensor];
      return typeof v === "number" && v >= c.min && v <= c.max;
    });
  });
  if (hits.length === 0) return null;
  hits.sort((a, b) => b.kondisi.length - a.kondisi.length);
  return hits[0];
}

// Peringatan: aturan baru bentrok dengan yang lama kalau di semua sensor yang mereka punya
// bersama, rentangnya saling beririsan.
export function cariTumpangTindih(baru: Kondisi[], rules: StaticRule[]) {
  return rules.filter((r) =>
    baru.every((c) => {
      const o = r.kondisi.find((k) => k.sensor === c.sensor);
      return !o || (c.min <= o.max && o.min <= c.max);
    })
  );
}

// Skor kecocokan 0-100: seberapa dekat bacaan sensor ke TENGAH rentang tiap kondisi rule.
// 100 = tepat di tengah, 50 = tepat di tepi rentang. Ini ukuran kedekatan, BUKAN probabilitas.
export function hitungSkor(sample: Sample, rule: StaticRule): number {
  const nilai = rule.kondisi.map((c) => {
    const v = sample[c.sensor];
    if (typeof v !== "number") return 0;
    const tengah = (c.min + c.max) / 2;
    const setengah = Math.max((c.max - c.min) / 2, 1);
    const jarak = Math.min(Math.abs(v - tengah) / setengah, 1);
    return 1 - 0.5 * jarak;
  });
  return Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 100);
}
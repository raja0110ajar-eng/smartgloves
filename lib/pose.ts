import { SENSOR_KEYS, SENSOR_RANGE, type Sample, type SensorKey } from "./schema";

export type Kondisi = { sensor: SensorKey; min: number; max: number };

export type StaticRule = {
  sign_id: string;
  teks: string;
  durasi_tahan_ms: number;
  kondisi: Kondisi[];
};

// Hitung batas min/max tiap sensor dari rekaman.
// Batas = rata-rata ± (2 x simpangan baku), dengan margin minimal 5% dari rentang sensor.
export function hitungKondisi(samples: Sample[]): Kondisi[] {
  return SENSOR_KEYS.map((sensor) => {
    const [lo, hi] = SENSOR_RANGE[sensor];
    const v = samples.map((s) => s[sensor]);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const std = Math.sqrt(
      v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length
    );
    const margin = Math.max(2 * std, 0.05 * (hi - lo));
    return {
      sensor,
      min: Math.round(Math.max(lo, mean - margin)),
      max: Math.round(Math.min(hi, mean + margin)),
    };
  });
}

// Dipakai ESP32 nanti: cari rule yang cocok dengan satu bacaan sensor.
// Kalau beberapa cocok, menang yang kondisinya paling banyak (paling spesifik).
export function cocokkanPose(sample: Sample, rules: StaticRule[]): StaticRule | null {
  const hits = rules.filter((r) =>
    r.kondisi.every((c) => sample[c.sensor] >= c.min && sample[c.sensor] <= c.max)
  );
  if (hits.length === 0) return null;
  hits.sort((a, b) => b.kondisi.length - a.kondisi.length);
  return hits[0];
}

// Peringatan: rule baru bentrok dengan rule lama kalau di semua sensor
// yang mereka punya bersama, rentangnya saling beririsan.
export function cariTumpangTindih(baru: Kondisi[], rules: StaticRule[]) {
  return rules.filter((r) =>
    baru.every((c) => {
      const o = r.kondisi.find((k) => k.sensor === c.sensor);
      return !o || (c.min <= o.max && o.min <= c.max);
    })
  );
}
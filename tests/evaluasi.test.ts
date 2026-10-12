import { describe, expect, it } from "vitest";
import {
  DETIK_JEDA,
  DETIK_UJI,
  SESI_AWAL,
  buatAntrean,
  hitungStatistik,
  median,
  persentil,
  reduksiSesi,
  wilson,
  type SesiData,
  type Sesi,
} from "../lib/evaluasi";

describe("wilson", () => {
  it("10 dari 10 benar masih menyisakan ketidakpastian di batas bawah", () => {
    const [lo, hi] = wilson(10, 10);
    expect(lo).toBeCloseTo(0.7225, 3);
    expect(hi).toBeCloseTo(1, 5);
  });
  it("5 dari 10", () => {
    const [lo, hi] = wilson(5, 10);
    expect(lo).toBeCloseTo(0.2366, 3);
    expect(hi).toBeCloseTo(0.7634, 3);
  });
  it("tanpa percobaan", () => {
    expect(wilson(0, 0)).toEqual([0, 0]);
  });
});

describe("median dan persentil", () => {
  it("median ganjil dan genap", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("persentil nearest-rank", () => {
    expect(persentil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    expect(persentil([400, 600], 90)).toBe(600);
  });
});

const sesi = (u: Partial<SesiData> = {}): SesiData => ({
  penguji: "P1",
  kondisi: "ruang terang",
  simulasi: false,
  trials: [
    { target: "a", hasil: "a", skor: 90, ms: 400 },
    { target: "a", hasil: "a", skor: 80, ms: 600 },
    { target: "a", hasil: "b", skor: 70, ms: 500 },
    { target: "a", hasil: null, skor: null, ms: null },
    { target: "b", hasil: "b", skor: 70, ms: 500 },
  ],
  ...u,
});

describe("hitungStatistik", () => {
  it("menghitung akurasi per isyarat dan keseluruhan", () => {
    const st = hitungStatistik([sesi()]);
    expect(st.totalTrial).toBe(5);
    expect(st.benar).toBe(3);
    expect(st.akurasi).toBeCloseTo(0.6, 5);
    expect(st.sesi).toBe(1);
    expect(st.penguji).toBe(1);

    const a = st.perSign.find((s) => s.id === "a")!;
    expect(a.n).toBe(4);
    expect(a.benar).toBe(2);
    expect(a.tidakTerdeteksi).toBe(1);
    expect(a.tertukar).toEqual([{ id: "b", jumlah: 1 }]);
    expect(a.skorRata).toBe(85);
    expect(a.latensiMedian).toBe(500);
    expect(a.latensiP90).toBe(600);
  });

  it("sesi simulasi tidak ikut kecuali diminta", () => {
    const data = [sesi(), sesi({ simulasi: true, penguji: "P2" })];
    expect(hitungStatistik(data).totalTrial).toBe(5);
    expect(hitungStatistik(data, { termasukSimulasi: true }).totalTrial).toBe(10);
    expect(hitungStatistik(data, { termasukSimulasi: true }).penguji).toBe(2);
  });

  it("aman untuk data kosong", () => {
    const st = hitungStatistik([]);
    expect(st.totalTrial).toBe(0);
    expect(st.akurasi).toBe(0);
  });
});

describe("buatAntrean", () => {
  it("jumlah dan sebaran sesuai, tanpa target kembar berurutan", () => {
    for (let k = 0; k < 20; k++) {
      const a = buatAntrean(["x", "y", "z"], 4);
      expect(a).toHaveLength(12);
      for (const id of ["x", "y", "z"]) expect(a.filter((v) => v === id)).toHaveLength(4);
      for (let i = 1; i < a.length; i++) expect(a[i]).not.toBe(a[i - 1]);
    }
  });
  it("satu isyarat tetap menghasilkan semua ulangan", () => {
    expect(buatAntrean(["x"], 3)).toEqual(["x", "x", "x"]);
  });
});

describe("mesin sesi", () => {
  const mulai = (): Sesi =>
    reduksiSesi(SESI_AWAL, { tipe: "mulai", antrean: ["a", "b"], sekarang: 1000 });
  const tick = (s: Sesi, n: number) => {
    let x = s;
    for (let i = 0; i < n; i++) x = reduksiSesi(x, { tipe: "tick", sekarang: 5000 });
    return x;
  };

  it("mulai pada fase uji", () => {
    const s = mulai();
    expect(s.fase).toBe("uji");
    expect(s.sisa).toBe(DETIK_UJI);
  });

  it("deteksi pertama dicatat beserta waktunya, lalu jeda", () => {
    const s = reduksiSesi(mulai(), {
      tipe: "event",
      sign_id: "a",
      skor: 88,
      simulasi: false,
      sekarang: 1450,
    });
    expect(s.trials).toEqual([{ target: "a", hasil: "a", skor: 88, ms: 450 }]);
    expect(s.fase).toBe("jeda");
  });

  it("event saat jeda diabaikan", () => {
    const j = reduksiSesi(mulai(), {
      tipe: "event",
      sign_id: "a",
      skor: 88,
      simulasi: false,
      sekarang: 1450,
    });
    const s = reduksiSesi(j, { tipe: "event", sign_id: "b", skor: 99, simulasi: false, sekarang: 1500 });
    expect(s.trials).toHaveLength(1);
  });

  it("jeda berakhir lalu percobaan berikutnya dimulai", () => {
    const j = reduksiSesi(mulai(), {
      tipe: "event",
      sign_id: "a",
      skor: 88,
      simulasi: false,
      sekarang: 1450,
    });
    const s = tick(j, DETIK_JEDA);
    expect(s.fase).toBe("uji");
    expect(s.pos).toBe(1);
  });

  it("waktu habis dicatat sebagai tidak terdeteksi", () => {
    const s = tick(mulai(), DETIK_UJI);
    expect(s.trials[0]).toEqual({ target: "a", hasil: null, skor: null, ms: null });
    expect(s.fase).toBe("jeda");
  });

  it("selesai setelah percobaan terakhir, dan menandai simulasi", () => {
    let s = reduksiSesi(mulai(), {
      tipe: "event",
      sign_id: "a",
      skor: 90,
      simulasi: true,
      sekarang: 1200,
    });
    s = tick(s, DETIK_JEDA);
    s = reduksiSesi(s, { tipe: "event", sign_id: "b", skor: 90, simulasi: false, sekarang: 5600 });
    expect(s.fase).toBe("selesai");
    expect(s.trials).toHaveLength(2);
    expect(s.simulasi).toBe(true);
  });
});
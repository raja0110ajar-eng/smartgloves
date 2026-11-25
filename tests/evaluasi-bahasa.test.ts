import { describe, expect, it } from "vitest";
import { ringkasPerBahasa, type StatSign } from "../lib/evaluasi";

const sign = (id: string, n: number, benar: number): StatSign => ({
  id,
  n,
  benar,
  tidakTerdeteksi: 0,
  akurasi: benar / n,
  ciBawah: 0,
  ciAtas: 1,
  skorRata: null,
  latensiMedian: null,
  latensiP90: null,
  tertukar: [],
});

describe("ringkasPerBahasa", () => {
  it("menggabungkan per bahasa", () => {
    const hasil = ringkasPerBahasa(
      [sign("a", 10, 9), sign("b", 10, 5), sign("c", 10, 10)],
      (id) => (id === "b" ? "BISINDO" : "SIBI")
    );
    expect(hasil.map((h) => h.bahasa)).toEqual(["BISINDO", "SIBI"]);
    const sibi = hasil.find((h) => h.bahasa === "SIBI")!;
    expect(sibi.n).toBe(20);
    expect(sibi.benar).toBe(19);
    expect(hasil.find((h) => h.bahasa === "BISINDO")!.akurasi).toBeCloseTo(0.5, 5);
  });
  it("mengabaikan isyarat yang bahasanya tidak diketahui", () => {
    expect(ringkasPerBahasa([sign("x", 5, 5)], () => undefined)).toEqual([]);
  });
});
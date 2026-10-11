import { describe, expect, it } from "vitest";
import { AWAL, SKOR_MINIMUM, kunciLevel, reduksi, type Kata } from "../lib/latihan";

const kata = (id: string, nama: string): Kata => ({ id, nama, teks: nama, kategori: "kata" });

describe("skor minimum", () => {
  const a = kata("a", "Halo");
  const mulai = () =>
    reduksi(AWAL, { tipe: "mulai", mode: "level", levelIdx: 0, antrean: [a], sekarang: 1000 });

  it("pose benar tetapi kurang rapi tidak dihitung", () => {
    const g = reduksi(mulai(), {
      tipe: "event",
      e: { sign_id: "a", teks: "Halo", skor: SKOR_MINIMUM - 1 },
      sekarang: 1000,
    });
    expect(g.poin).toBe(0);
    expect(g.pos).toBe(0);
    expect(g.umpan?.jenis).toBe("salah");
    expect(g.umpan?.teks).toContain("kurang rapi");
  });

  it("tepat di batas minimum diterima", () => {
    const g = reduksi(mulai(), {
      tipe: "event",
      e: { sign_id: "a", teks: "Halo", skor: SKOR_MINIMUM },
      sekarang: 1000,
    });
    expect(g.poin).toBe(SKOR_MINIMUM + 50);
    expect(g.benar).toBe(1);
  });

  it("huruf yang kurang rapi tidak masuk ejaan", () => {
    const g0 = reduksi(AWAL, {
      tipe: "mulai",
      mode: "eja",
      antreanEja: ["IBU"],
      kamusEja: ["IBU"],
      sekarang: 0,
    });
    const g = reduksi(g0, {
      tipe: "event",
      e: { sign_id: "x", teks: "I", skor: 30 },
      sekarang: 0,
    });
    expect(g.terkumpul).toBe("");
    expect(g.umpan?.jenis).toBe("salah");
  });
});

describe("kunciLevel", () => {
  it("tidak bergantung pada urutan", () => {
    expect(kunciLevel([kata("a", "A"), kata("b", "B")])).toBe(
      kunciLevel([kata("b", "B"), kata("a", "A")])
    );
  });
  it("berubah kalau anggotanya berubah", () => {
    expect(kunciLevel([kata("a", "A"), kata("b", "B")])).not.toBe(
      kunciLevel([kata("a", "A"), kata("c", "C")])
    );
  });
});
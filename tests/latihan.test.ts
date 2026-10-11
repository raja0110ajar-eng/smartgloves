import { describe, expect, it } from "vitest";
import {
  AWAL,
  DETIK_PER_TARGET,
  DETIK_TIME_ATTACK,
  acakAntrean,
  bangunLevel,
  hitungBintang,
  kataEjaTersedia,
  kocok,
  namaLevel,
  reduksi,
  type Game,
  type Kata,
} from "../lib/latihan";

const kata = (
  id: string,
  nama: string,
  teks = nama,
  kategori: Kata["kategori"] = "kata"
): Kata => ({ id, nama, teks, kategori });

const huruf = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const h = String.fromCharCode(65 + i);
    return kata(`h${i}`, h, h, "huruf");
  });

const tick = (g: Game, n: number) => {
  let s = g;
  for (let i = 0; i < n; i++) s = reduksi(s, { tipe: "tick", sekarang: 0 });
  return s;
};

describe("hitungBintang", () => {
  it("mengikuti persentase benar", () => {
    expect(hitungBintang(5, 5)).toBe(3);
    expect(hitungBintang(4, 5)).toBe(2);
    expect(hitungBintang(3, 5)).toBe(1);
    expect(hitungBintang(2, 5)).toBe(0);
    expect(hitungBintang(0, 0)).toBe(0);
  });
});

describe("bangunLevel", () => {
  it("potongan terakhir yang kecil digabung ke level sebelumnya", () => {
    const level = bangunLevel(huruf(7));
    expect(level).toHaveLength(1);
    expect(level[0]).toHaveLength(7);
  });
  it("8 huruf menjadi dua level", () => {
    expect(bangunLevel(huruf(8)).map((l) => l.length)).toEqual([5, 3]);
  });
  it("nama level memuat kategori dan rentang", () => {
    const level = bangunLevel(huruf(5));
    expect(namaLevel(level[0], 0)).toBe("Level 1: Huruf A - E");
  });
});

describe("kataEjaTersedia", () => {
  it("hanya kata yang semua hurufnya ada", () => {
    const k = [kata("i", "I", "I", "huruf"), kata("b", "B", "B", "huruf"), kata("u", "U", "U", "huruf")];
    const hasil = kataEjaTersedia(k);
    expect(hasil).toContain("IBU");
    expect(hasil).not.toContain("AYAH");
  });
  it("mengabaikan yang bukan kategori huruf", () => {
    const k = [kata("i", "I", "I", "kata"), kata("b", "B", "B", "huruf"), kata("u", "U", "U", "huruf")];
    expect(kataEjaTersedia(k)).not.toContain("IBU");
  });
});

describe("acakAntrean dan kocok", () => {
  it("tidak mengulang kata yang sama berturut-turut", () => {
    const hasil = acakAntrean([kata("a", "A"), kata("b", "B"), kata("c", "C")], 50);
    expect(hasil).toHaveLength(50);
    for (let i = 1; i < hasil.length; i++) expect(hasil[i].id).not.toBe(hasil[i - 1].id);
  });
  it("kocok tidak mengubah isi dan tidak merusak aslinya", () => {
    const asal = [1, 2, 3, 4, 5];
    const hasil = kocok(asal);
    expect([...hasil].sort()).toEqual(asal);
    expect(asal).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("mesin permainan: level", () => {
  const a = kata("a", "Halo");
  const b = kata("b", "Tolong");
  const mulai = () =>
    reduksi(AWAL, { tipe: "mulai", mode: "level", levelIdx: 0, antrean: [a, b], sekarang: 1000 });

  it("mulai", () => {
    const g = mulai();
    expect(g.fase).toBe("main");
    expect(g.sisaDetik).toBe(DETIK_PER_TARGET);
  });
  it("jawaban benar secepat kilat: skor ditambah bonus penuh", () => {
    const g = reduksi(mulai(), {
      tipe: "event",
      e: { sign_id: "a", teks: "Halo", skor: 90 },
      sekarang: 1000,
    });
    expect(g.poin).toBe(140);
    expect(g.benar).toBe(1);
    expect(g.pos).toBe(1);
    expect(g.fase).toBe("main");
  });
  it("bonus berkurang seiring waktu", () => {
    const g = reduksi(mulai(), {
      tipe: "event",
      e: { sign_id: "a", teks: "Halo", skor: 90 },
      sekarang: 3000,
    });
    expect(g.poin).toBe(130);
  });
  it("skor kosong memakai nilai bawaan", () => {
    const g = reduksi(mulai(), {
      tipe: "event",
      e: { sign_id: "a", teks: "Halo", skor: null },
      sekarang: 1000,
    });
    expect(g.poin).toBe(120);
  });
  it("jawaban salah tidak menambah poin", () => {
    const g = reduksi(mulai(), {
      tipe: "event",
      e: { sign_id: "b", teks: "Tolong", skor: 99 },
      sekarang: 1000,
    });
    expect(g.poin).toBe(0);
    expect(g.pos).toBe(0);
    expect(g.umpan?.jenis).toBe("salah");
  });
  it("selesai setelah target terakhir", () => {
    let g = mulai();
    g = reduksi(g, { tipe: "event", e: { sign_id: "a", teks: "Halo", skor: 90 }, sekarang: 1000 });
    g = reduksi(g, { tipe: "event", e: { sign_id: "b", teks: "Tolong", skor: 90 }, sekarang: 3000 });
    expect(g.fase).toBe("selesai");
    expect(g.benar).toBe(2);
    expect(g.poin).toBe(270);
  });
  it("waktu habis melewati target", () => {
    const g = tick(mulai(), DETIK_PER_TARGET);
    expect(g.pos).toBe(1);
    expect(g.benar).toBe(0);
    expect(g.umpan?.jenis).toBe("salah");
    expect(g.sisaDetik).toBe(DETIK_PER_TARGET);
  });
});

describe("mesin permainan: time attack", () => {
  const mulai = () =>
    reduksi(AWAL, {
      tipe: "mulai",
      mode: "time",
      antrean: [kata("a", "A"), kata("b", "B")],
      sekarang: 0,
    });
  it("berjalan sampai waktu habis", () => {
    expect(tick(mulai(), DETIK_TIME_ATTACK - 1).fase).toBe("main");
    expect(tick(mulai(), DETIK_TIME_ATTACK).fase).toBe("selesai");
  });
});

describe("mesin permainan: eja kata", () => {
  const mulai = () =>
    reduksi(AWAL, {
      tipe: "mulai",
      mode: "eja",
      antreanEja: ["IBU"],
      kamusEja: ["IBU", "AIR"],
      sekarang: 0,
    });
  const huruf1 = (g: Game, h: string) =>
    reduksi(g, { tipe: "event", e: { sign_id: "x", teks: h, skor: null }, sekarang: 0 });

  it("ejaan tepat mendapat 100 poin", () => {
    let g = mulai();
    for (const h of ["I", "B", "U"]) g = huruf1(g, h);
    expect(g.fase).toBe("selesai");
    expect(g.poin).toBe(100);
    expect(g.benar).toBe(1);
  });
  it("satu huruf salah dikoreksi otomatis dengan poin lebih rendah", () => {
    let g = mulai();
    for (const h of ["I", "B", "A"]) g = huruf1(g, h);
    expect(g.poin).toBe(60);
    expect(g.benar).toBe(0);
    expect(g.umpan?.jenis).toBe("benar");
    expect(g.umpan?.teks).toContain("dikoreksi otomatis");
  });
  it("mengabaikan masukan yang bukan huruf", () => {
    const g = huruf1(mulai(), "Halo");
    expect(g.terkumpul).toBe("");
    expect(g.umpan?.jenis).toBe("salah");
  });
});
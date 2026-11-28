import { describe, expect, it } from "vitest";
import { KalibrasiSchema, nilaiJari, olahTangan } from "../lib/kalibrasi";

const tangan = {
  lurus: [600, 610, 590, 620, 605],
  tekuk: [1700, 1650, 1800, 900, 1750],
  diterima: [1, 1, 1, 1, 0],
  alasan: [0, 0, 0, 0, 2],
};

describe("nilaiJari", () => {
  it("baik, lemah, dan ditolak", () => {
    expect(nilaiJari(600, 1700, 1, 0).status).toBe("baik");
    expect(nilaiJari(620, 900, 1, 0).status).toBe("lemah");
    const t = nilaiJari(600, 1700, 0, 2);
    expect(t.status).toBe("ditolak");
    expect(t.catatan).toContain("bergerak");
  });
  it("arah sensor tidak berpengaruh pada selisih", () => {
    expect(nilaiJari(1700, 600, 1, 0).selisih).toBe(1100);
  });
});

describe("olahTangan", () => {
  it("menghitung ringkasan", () => {
    const r = olahTangan(tangan);
    expect(r.ringkas).toEqual({ baik: 3, lemah: 1, ditolak: 1 });
    expect(r.jari).toHaveLength(5);
  });
});

describe("KalibrasiSchema", () => {
  it("menerima data lengkap", () => {
    expect(KalibrasiSchema.safeParse({ device_id: "glove_01", sumber: "tombol", kanan: tangan }).success).toBe(true);
  });
  it("menolak larik yang bukan 5 jari", () => {
    const rusak = { ...tangan, lurus: [1, 2, 3, 4] };
    expect(KalibrasiSchema.safeParse({ device_id: "g", sumber: "tombol", kanan: rusak }).success).toBe(false);
  });
  it("menolak tanpa tangan sama sekali", () => {
    expect(KalibrasiSchema.safeParse({ device_id: "g", sumber: "web" }).success).toBe(false);
  });
});
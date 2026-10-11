import { describe, expect, it } from "vitest";
import { koreksiKata, levenshtein } from "../lib/teks";
import { buatSlug } from "../lib/slug";

describe("levenshtein", () => {
  it("0 untuk teks yang sama", () => {
    expect(levenshtein("saya", "saya")).toBe(0);
  });
  it("selisih satu huruf", () => {
    expect(levenshtein("saye", "saya")).toBe(1);
  });
  it("kasus klasik", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
  it("string kosong", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

describe("koreksiKata", () => {
  const kamus = ["saya", "kamu", "kami"];
  it("memperbaiki satu huruf yang salah", () => {
    expect(koreksiKata("saye", kamus, 1)).toEqual({ kata: "saya", jarak: 1 });
  });
  it("tidak peka huruf besar", () => {
    expect(koreksiKata("SAYA", kamus)).toEqual({ kata: "saya", jarak: 0 });
  });
  it("null kalau terlalu jauh", () => {
    expect(koreksiKata("xyz", kamus, 1)).toBeNull();
  });
  it("null kalau ambigu", () => {
    expect(koreksiKata("kamo", ["kamu", "kami"], 1)).toBeNull();
  });
  it("kecocokan tepat menang", () => {
    expect(koreksiKata("kamu", ["kami", "kamu"], 1)).toEqual({ kata: "kamu", jarak: 0 });
  });
});

describe("buatSlug", () => {
  it("huruf kecil dan tanda minus", () => {
    expect(buatSlug("Terima kasih")).toBe("terima-kasih");
  });
  it("membuang tanda baca", () => {
    expect(buatSlug("Halo!")).toBe("halo");
  });
  it("membuang spasi di tepi", () => {
    expect(buatSlug("  Apa kabar?  ")).toBe("apa-kabar");
  });
  it("membuang aksen", () => {
    expect(buatSlug("Café")).toBe("cafe");
  });
  it("kosong kalau tidak ada huruf atau angka", () => {
    expect(buatSlug("!!!")).toBe("");
  });
  it("dipotong maksimal 60 karakter", () => {
    expect(buatSlug("a".repeat(100)).length).toBe(60);
  });
});
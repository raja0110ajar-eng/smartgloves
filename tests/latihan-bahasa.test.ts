import { describe, expect, it } from "vitest";
import { kunciProgres, saringBahasa, type Kata } from "../lib/latihan";

const k = (id: string, bahasa?: "SIBI" | "BISINDO"): Kata => ({
  id,
  nama: id,
  teks: id,
  kategori: "kata",
  bahasa,
});

describe("saringBahasa", () => {
  it("memilih bahasa, dan data tanpa bahasa dianggap SIBI", () => {
    const daftar = [k("a", "SIBI"), k("b", "BISINDO"), k("c")];
    expect(saringBahasa(daftar, "SIBI").map((x) => x.id)).toEqual(["a", "c"]);
    expect(saringBahasa(daftar, "BISINDO").map((x) => x.id)).toEqual(["b"]);
  });
});

describe("kunciProgres", () => {
  it("terpisah per bahasa", () => {
    expect(kunciProgres("SIBI")).not.toBe(kunciProgres("BISINDO"));
  });
});
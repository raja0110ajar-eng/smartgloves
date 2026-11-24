import { describe, expect, it } from "vitest";
import { idKata, kunciKata, normBahasa } from "../lib/bahasa";

describe("normBahasa", () => {
  it("mengenali BISINDO, selain itu SIBI", () => {
    expect(normBahasa("BISINDO")).toBe("BISINDO");
    expect(normBahasa("SIBI")).toBe("SIBI");
    expect(normBahasa(undefined)).toBe("SIBI");
    expect(normBahasa("bisindo")).toBe("SIBI");
  });
});

describe("kunciKata dan idKata", () => {
  it("kata yang sama di dua bahasa punya kunci dan ID berbeda", () => {
    expect(kunciKata("SIBI", "halo")).not.toBe(kunciKata("BISINDO", "halo"));
    expect(idKata("SIBI", "halo")).toBe("sibi-halo");
    expect(idKata("BISINDO", "terima-kasih")).toBe("bisindo-terima-kasih");
  });
});
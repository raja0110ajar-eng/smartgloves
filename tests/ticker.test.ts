import { describe, expect, it } from "vitest";
import { TICKER_BAWAAN, TickerSchema, rapikanPesan } from "../lib/tickerAturan";

describe("TickerSchema", () => {
  it("menerima pengaturan bawaan", () => {
    expect(TickerSchema.safeParse(TICKER_BAWAAN).success).toBe(true);
  });
  it("menolak lebih dari 8 pesan", () => {
    const pesan = Array.from({ length: 9 }, () => "x");
    expect(TickerSchema.safeParse({ aktif: true, pesan }).success).toBe(false);
  });
  it("menolak pesan lebih dari 140 karakter", () => {
    expect(TickerSchema.safeParse({ aktif: true, pesan: ["a".repeat(141)] }).success).toBe(false);
  });
  it("menolak pesan kosong", () => {
    expect(TickerSchema.safeParse({ aktif: true, pesan: ["   "] }).success).toBe(false);
  });
});

describe("rapikanPesan", () => {
  it("membuang baris kosong dan merapikan spasi", () => {
    expect(rapikanPesan(["  halo   dunia ", "", "   "])).toEqual(["halo dunia"]);
  });
});
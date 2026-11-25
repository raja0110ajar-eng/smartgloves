import { describe, expect, it } from "vitest";
import { persenBaterai } from "../lib/baterai";

describe("persenBaterai", () => {
  it("batas atas dan bawah", () => {
    expect(persenBaterai(4200)).toBe(100);
    expect(persenBaterai(4350)).toBe(100);
    expect(persenBaterai(3300)).toBe(0);
    expect(persenBaterai(3000)).toBe(0);
  });
  it("titik kurva dan interpolasi", () => {
    expect(persenBaterai(3800)).toBe(50);
    expect(persenBaterai(3750)).toBe(43);
  });
  it("null untuk nilai yang tidak masuk akal", () => {
    expect(persenBaterai(0)).toBeNull();
    expect(persenBaterai(9999)).toBeNull();
    expect(persenBaterai("3700")).toBeNull();
    expect(persenBaterai(undefined)).toBeNull();
  });
});
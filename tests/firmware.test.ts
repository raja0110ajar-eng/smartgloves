import { describe, expect, it } from "vitest";
import { SEMVER, bandingVersi } from "../lib/firmwareAturan";

describe("versi firmware", () => {
  it("memeriksa bentuk versi", () => {
    expect(SEMVER.test("0.6.1")).toBe(true);
    expect(SEMVER.test("0.6")).toBe(false);
    expect(SEMVER.test("v1.0.0")).toBe(false);
  });
  it("membandingkan angka, bukan teks", () => {
    expect(bandingVersi("0.10.0", "0.9.9")).toBe(1);
    expect(bandingVersi("0.6.0", "0.6.0")).toBe(0);
    expect(bandingVersi("0.5.9", "0.6.0")).toBe(-1);
  });
});
import { describe, expect, it } from "vitest";
import { BATAS_ONLINE_DETIK, kondisiPerangkat, teksDurasi } from "../lib/statusBantu";

describe("kondisiPerangkat", () => {
  it("belum pernah terhubung", () => {
    expect(kondisiPerangkat(null)).toBe("belum");
  });
  it("online di dalam batas", () => {
    expect(kondisiPerangkat(0)).toBe("online");
    expect(kondisiPerangkat(BATAS_ONLINE_DETIK)).toBe("online");
  });
  it("putus setelah melewati batas", () => {
    expect(kondisiPerangkat(BATAS_ONLINE_DETIK + 1)).toBe("putus");
  });
});

describe("teksDurasi", () => {
  it("satuan yang sesuai", () => {
    expect(teksDurasi(5)).toBe("baru saja");
    expect(teksDurasi(30)).toBe("30 detik lalu");
    expect(teksDurasi(120)).toBe("2 menit lalu");
    expect(teksDurasi(7200)).toBe("2 jam lalu");
    expect(teksDurasi(172800)).toBe("2 hari lalu");
  });
  it("tidak negatif", () => {
    expect(teksDurasi(-20)).toBe("baru saja");
  });
});
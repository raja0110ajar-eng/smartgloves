import { describe, expect, it } from "vitest";
import {
  BATAS_KONFIRMASI_MS,
  POLL_CEPAT_MS,
  POLL_NORMAL_MS,
  pollMsUntuk,
  statusEfektif,
  validasiParam,
} from "../lib/perintah";

describe("validasiParam", () => {
  it("bahasa hanya SIBI atau BISINDO", () => {
    expect(validasiParam("bahasa", "BISINDO")).toEqual({ ok: true, param: "BISINDO" });
    expect(validasiParam("bahasa", "ASL").ok).toBe(false);
    expect(validasiParam("bahasa", null).ok).toBe(false);
  });
  it("volume bilangan bulat 0 sampai 21", () => {
    expect(validasiParam("volume", 15)).toEqual({ ok: true, param: "15" });
    expect(validasiParam("volume", "0")).toEqual({ ok: true, param: "0" });
    expect(validasiParam("volume", 22).ok).toBe(false);
    expect(validasiParam("volume", 3.5).ok).toBe(false);
    expect(validasiParam("volume", null).ok).toBe(false);
  });
  it("putar butuh teks 1 sampai 60 karakter", () => {
    expect(validasiParam("putar", "  Halo ")).toEqual({ ok: true, param: "Halo" });
    expect(validasiParam("putar", "").ok).toBe(false);
    expect(validasiParam("putar", "x".repeat(61)).ok).toBe(false);
  });
  it("aksi lain mengabaikan parameter", () => {
    expect(validasiParam("rekam", "apa saja")).toEqual({ ok: true, param: "" });
    expect(validasiParam("mulai_ulang", undefined)).toEqual({ ok: true, param: "" });
  });
});

describe("pollMsUntuk", () => {
  it("cepat kalau ada perintah tertunda atau sesi masih berlaku", () => {
    expect(pollMsUntuk(true, 0, 1000)).toBe(POLL_CEPAT_MS);
    expect(pollMsUntuk(false, 5000, 1000)).toBe(POLL_CEPAT_MS);
  });
  it("normal kalau tidak ada keduanya", () => {
    expect(pollMsUntuk(false, 0, 1000)).toBe(POLL_NORMAL_MS);
    expect(pollMsUntuk(false, 900, 1000)).toBe(POLL_NORMAL_MS);
  });
});

describe("statusEfektif", () => {
  it("dikirim yang terlalu lama menjadi tidak ada konfirmasi", () => {
    expect(statusEfektif("dikirim", 1000, 1000 + BATAS_KONFIRMASI_MS + 1)).toBe("tidak ada konfirmasi");
    expect(statusEfektif("dikirim", 1000, 2000)).toBe("dikirim");
  });
  it("status lain tidak berubah", () => {
    expect(statusEfektif("selesai", 1000, 9_999_999)).toBe("selesai");
    expect(statusEfektif("menunggu", 0, 9_999_999)).toBe("menunggu");
  });
});
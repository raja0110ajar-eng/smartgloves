import { describe, expect, it } from "vitest";
import { DetailSchema } from "../lib/detail";

const dasar = {
  arti: "",
  panduan: "",
  verifikasi: { status: "belum" as const, oleh: "", tanggal: "" },
  gambar_url: "",
  gambar_alt: "",
  video_id: "",
  video_deskripsi: "",
};

describe("DetailSchema", () => {
  it("menerima detail kosong", () => {
    expect(DetailSchema.safeParse(dasar).success).toBe(true);
  });
  it("status diverifikasi butuh nama dan tanggal", () => {
    const ok = { ...dasar, verifikasi: { status: "diverifikasi" as const, oleh: "Bu Sari", tanggal: "2026-10-01" } };
    expect(DetailSchema.safeParse(ok).success).toBe(true);
    expect(
      DetailSchema.safeParse({ ...ok, verifikasi: { ...ok.verifikasi, oleh: "" } }).success
    ).toBe(false);
    expect(
      DetailSchema.safeParse({ ...ok, verifikasi: { ...ok.verifikasi, tanggal: "" } }).success
    ).toBe(false);
  });
  it("gambar wajib punya teks alternatif", () => {
    expect(DetailSchema.safeParse({ ...dasar, gambar_url: "https://x/y.webp" }).success).toBe(false);
    expect(
      DetailSchema.safeParse({ ...dasar, gambar_url: "https://x/y.webp", gambar_alt: "Tangan membentuk huruf A" }).success
    ).toBe(true);
  });
  it("video wajib punya deskripsi dan ID 11 karakter", () => {
    expect(DetailSchema.safeParse({ ...dasar, video_id: "dQw4w9WgXcQ" }).success).toBe(false);
    expect(
      DetailSchema.safeParse({ ...dasar, video_id: "dQw4w9WgXcQ", video_deskripsi: "Peragaan huruf A" }).success
    ).toBe(true);
    expect(
      DetailSchema.safeParse({ ...dasar, video_id: "pendek", video_deskripsi: "x" }).success
    ).toBe(false);
  });
});
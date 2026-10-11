import { describe, expect, it } from "vitest";
import { EventSchema, HalamanSchema } from "../lib/schema";

const halaman = { judul: "Tentang", isi: "", urutan: 1, tampil: true };

describe("HalamanSchema", () => {
  it("menerima alamat yang wajar", () => {
    expect(HalamanSchema.safeParse({ ...halaman, slug: "tentang" }).success).toBe(true);
  });
  it("menolak alamat yang dipakai sistem", () => {
    expect(HalamanSchema.safeParse({ ...halaman, slug: "admin" }).success).toBe(false);
  });
  it("menolak alamat dengan spasi atau huruf besar", () => {
    expect(HalamanSchema.safeParse({ ...halaman, slug: "Tentang Kami" }).success).toBe(false);
  });
});

describe("EventSchema", () => {
  const dasar = { sign_id: "halo", teks: "Halo", device_id: "glove_01" };
  it("skor opsional", () => {
    expect(EventSchema.safeParse(dasar).success).toBe(true);
  });
  it("skor harus 0 sampai 100", () => {
    expect(EventSchema.safeParse({ ...dasar, skor: 100 }).success).toBe(true);
    expect(EventSchema.safeParse({ ...dasar, skor: 101 }).success).toBe(false);
  });
});
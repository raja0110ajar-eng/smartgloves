import { describe, expect, it } from "vitest";
import { KesanSchema, bersihkan, perluTinjau } from "../lib/kesanAturan";

describe("perluTinjau", () => {
  it("pesan biasa lolos", () => {
    expect(perluTinjau("Karyanya keren sekali, semoga bermanfaat untuk teman Tuli!")).toBeNull();
  });
  it("kata pendek hanya cocok sebagai kata utuh", () => {
    expect(perluTinjau("Cocok untuk asuransi dan tailor")).toBeNull();
    expect(perluTinjau("dasar asu")).toBe("kata");
  });
  it("mengenali kata kasar yang disamarkan", () => {
    expect(perluTinjau("4nj1ng banget")).toBe("kata");
  });
  it("tautan, kontak, dan pengulangan", () => {
    expect(perluTinjau("kunjungi www.contoh.id")).toBe("tautan");
    expect(perluTinjau("hubungi saya di budi@mail.com")).toBe("kontak");
    expect(perluTinjau("telepon 0812 3456 7890 ya")).toBe("kontak");
    expect(perluTinjau("kerennnnnnnnnn")).toBe("berulang");
  });
});

describe("bersihkan dan skema", () => {
  it("membuang tanda kurung sudut dan merapikan spasi", () => {
    expect(bersihkan("  Halo <b>dunia</b>\n\n  ya ")).toBe("Halo b dunia /b ya");
  });
  it("pesan minimal 5 dan maksimal 300 karakter", () => {
    expect(KesanSchema.safeParse({ pesan: "halo" }).success).toBe(false);
    expect(KesanSchema.safeParse({ pesan: "x".repeat(301) }).success).toBe(false);
    expect(KesanSchema.safeParse({ pesan: "Keren sekali!" }).success).toBe(true);
  });
});
import { describe, expect, it } from "vitest";
import {
  EventSchema,
  HalamanSchema,
  RecordSchema,
  RuleSchema,
  SampleSchema,
} from "../lib/schema";

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
  it("skor dan bahasa opsional", () => {
    expect(EventSchema.safeParse(dasar).success).toBe(true);
  });
  it("skor harus 0 sampai 100", () => {
    expect(EventSchema.safeParse({ ...dasar, skor: 100 }).success).toBe(true);
    expect(EventSchema.safeParse({ ...dasar, skor: 101 }).success).toBe(false);
  });
  it("bahasa harus SIBI atau BISINDO", () => {
    expect(EventSchema.safeParse({ ...dasar, bahasa: "BISINDO" }).success).toBe(true);
    expect(EventSchema.safeParse({ ...dasar, bahasa: "ASL" }).success).toBe(false);
  });
});

const tanganKanan = {
  R_IBU_JARI: 8, R_TELUNJUK: 80, R_TENGAH: 78, R_MANIS: 82, R_KELINGKING: 79, R_PITCH: 5, R_ROLL: 0,
};
const tanganKiri = {
  L_IBU_JARI: 8, L_TELUNJUK: 80, L_TENGAH: 78, L_MANIS: 82, L_KELINGKING: 79, L_PITCH: 5, L_ROLL: 0,
};

describe("SampleSchema", () => {
  it("menerima satu tangan atau dua tangan", () => {
    expect(SampleSchema.safeParse(tanganKanan).success).toBe(true);
    expect(SampleSchema.safeParse({ ...tanganKanan, ...tanganKiri }).success).toBe(true);
  });
  it("menolak tangan yang datanya tidak lengkap", () => {
    expect(SampleSchema.safeParse({ ...tanganKanan, L_ROLL: 1 }).success).toBe(false);
  });
  it("menolak sampel kosong atau hanya berisi kunci lama", () => {
    expect(SampleSchema.safeParse({}).success).toBe(false);
    expect(SampleSchema.safeParse({ IBU_JARI: 1, TELUNJUK: 2 }).success).toBe(false);
  });
});

describe("RecordSchema", () => {
  it("minimal 5 sampel", () => {
    const sampel = (n: number) => Array.from({ length: n }, () => tanganKanan);
    expect(RecordSchema.safeParse({ device_id: "g", samples: sampel(5) }).success).toBe(true);
    expect(RecordSchema.safeParse({ device_id: "g", samples: sampel(4) }).success).toBe(false);
  });
});

describe("RuleSchema", () => {
  const rule = (kondisi: unknown) => ({ sign_id: "x", durasi_tahan_ms: 400, kondisi });
  it("menerima sensor tangan kanan dan kiri", () => {
    expect(
      RuleSchema.safeParse(
        rule([
          { sensor: "R_TELUNJUK", min: 1, max: 2 },
          { sensor: "L_TELUNJUK", min: 1, max: 2 },
        ])
      ).success
    ).toBe(true);
  });
  it("menolak sensor yang tidak dikenal dan batas terbalik", () => {
    expect(RuleSchema.safeParse(rule([{ sensor: "ASING", min: 1, max: 2 }])).success).toBe(false);
    expect(RuleSchema.safeParse(rule([{ sensor: "R_ROLL", min: 5, max: 2 }])).success).toBe(false);
  });
});
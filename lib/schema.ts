import { z } from "zod";
import { KATEGORI } from "./kategori";

export const EventSchema = z.object({
  sign_id: z.string().min(1).max(50),
  teks: z.string().min(1).max(100),
  device_id: z.string().min(1).max(50),
  timestamp: z.number().int().optional(),
  skor: z.number().min(0).max(100).optional(),
});

export type EventInput = z.infer<typeof EventSchema>;
export const SignCreateSchema = z.object({
  nama_isyarat: z.string().trim().min(1).max(50),
  teks_output: z.string().trim().min(1).max(100),
  kategori: z.enum(KATEGORI).optional(),
});

export const SignToggleSchema = z.object({
  id: z.string().min(1),
  aktif: z.boolean(),
});

export const SimulateSchema = z.object({
  sign_id: z.string().min(1),
});
export const SENSOR_KEYS = [
  "IBU_JARI",
  "TELUNJUK",
  "TENGAH",
  "MANIS",
  "KELINGKING",
  "PITCH",
  "ROLL",
] as const;

export type SensorKey = (typeof SENSOR_KEYS)[number];

// Jari: 0 (lurus) sampai 100 (tekuk penuh). Pitch/Roll dalam derajat.
export const SENSOR_RANGE: Record<SensorKey, [number, number]> = {
  IBU_JARI: [0, 100],
  TELUNJUK: [0, 100],
  TENGAH: [0, 100],
  MANIS: [0, 100],
  KELINGKING: [0, 100],
  PITCH: [-90, 90],
  ROLL: [-180, 180],
};

export const SampleSchema = z.object({
  IBU_JARI: z.number(),
  TELUNJUK: z.number(),
  TENGAH: z.number(),
  MANIS: z.number(),
  KELINGKING: z.number(),
  PITCH: z.number(),
  ROLL: z.number(),
});
export type Sample = z.infer<typeof SampleSchema>;

export const RecordSchema = z.object({
  device_id: z.string().min(1).max(50),
  samples: z.array(SampleSchema).min(5).max(100),
});

export const RuleSchema = z.object({
  sign_id: z.string().min(1),
  durasi_tahan_ms: z.number().int().min(100).max(3000),
  kondisi: z
    .array(
      z
        .object({
          sensor: z.enum(SENSOR_KEYS),
          min: z.number(),
          max: z.number(),
        })
        .refine((c) => c.min <= c.max)
    )
    .min(1)
    .max(7),
});
export const AiRequestSchema = z.object({
  perintah: z.string().trim().min(2).max(500),
});

export const AiDraftSchema = z.object({
  nama_isyarat: z.string().trim().min(1).max(50),
  teks_output: z.string().trim().min(1).max(100),
});

export const AiResultSchema = z.object({
  kata: z.array(AiDraftSchema).max(20),
});
export const SignUpdateSchema = z.object({
  id: z.string().min(1),
  nama_isyarat: z.string().trim().min(1).max(50),
  teks_output: z.string().trim().min(1).max(100),
  kategori: z.enum(KATEGORI).optional(),
});

export const SignDeleteSchema = z.object({
  id: z.string().min(1),
});

export const CleanSchema = z.object({
  simulasi: z.boolean(),
});
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DIPAKAI_SISTEM = ["admin", "login", "api", "kamus", "live", "latihan"];

export const HalamanSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Alamat minimal 2 karakter.")
    .max(60, "Alamat maksimal 60 karakter.")
    .regex(SLUG_RE, "Alamat hanya boleh huruf kecil, angka, dan tanda minus.")
    .refine((s) => !DIPAKAI_SISTEM.includes(s), "Alamat ini dipakai sistem, pilih yang lain."),
  judul: z
    .string()
    .trim()
    .min(1, "Judul wajib diisi.")
    .max(80, "Judul maksimal 80 karakter."),
  isi: z.string().max(20000, "Isi terlalu panjang."),
  urutan: z.number().int().min(0).max(999),
  tampil: z.boolean(),
});

export const HalamanHapusSchema = z.object({
  slug: z.string().min(1),
});
export const AiPerintahSchema = z.object({
  perintah: z.string().trim().min(2).max(4000),
});

export const AksiSchema = z.discriminatedUnion("tipe", [
  z.object({
    tipe: z.literal("kata_tambah"),
    nama_isyarat: z.string().trim().min(1).max(50),
    teks_output: z.string().trim().min(1).max(100),
    kategori: z.enum(KATEGORI).nullish().catch(null),
  }),
  z.object({
    tipe: z.literal("kata_ubah"),
    id: z.string().min(1),
    nama_isyarat: z.string().trim().min(1).max(50),
    teks_output: z.string().trim().min(1).max(100),
  }),
  z.object({
    tipe: z.literal("kata_aktif"),
    id: z.string().min(1),
    aktif: z.boolean(),
  }),
  z.object({
    tipe: z.literal("kata_hapus"),
    id: z.string().min(1),
  }),
  z.object({
    tipe: z.literal("halaman_tulis"),
    slug: HalamanSchema.shape.slug,
    judul: HalamanSchema.shape.judul,
    isi: HalamanSchema.shape.isi,
    urutan: z.number().int().min(0).max(999).nullish(),
    tampil: z.boolean().nullish(),
  }),
  z.object({
    tipe: z.literal("halaman_tampil"),
    slug: HalamanSchema.shape.slug,
    tampil: z.boolean(),
  }),
  z.object({
    tipe: z.literal("halaman_hapus"),
    slug: HalamanSchema.shape.slug,
  }),
]);

export type Aksi = z.infer<typeof AksiSchema>;

export const TerapkanSchema = z.object({
  perintah: z.string().max(4000).optional(),
  aksi: z.array(AksiSchema).min(1).max(20),
});
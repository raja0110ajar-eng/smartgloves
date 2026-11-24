import { z } from "zod";
import { KATEGORI } from "./kategori";
import { BAHASA } from "./bahasa";

/* ---------- Event dari perangkat ---------- */
export const EventSchema = z.object({
  sign_id: z.string().min(1).max(100),
  teks: z.string().min(1).max(100),
  device_id: z.string().min(1).max(50),
  timestamp: z.number().int().optional(),
  skor: z.number().min(0).max(100).optional(),
  bahasa: z.enum(BAHASA).optional(),
});
export type EventInput = z.infer<typeof EventSchema>;

/* ---------- Kata (admin) ---------- */
export const SignCreateSchema = z.object({
  nama_isyarat: z.string().trim().min(1).max(50),
  teks_output: z.string().trim().min(1).max(100),
  kategori: z.enum(KATEGORI).optional(),
  bahasa: z.enum(BAHASA).optional(),
});

export const SignToggleSchema = z.object({
  id: z.string().min(1),
  aktif: z.boolean(),
});

export const SimulateSchema = z.object({
  sign_id: z.string().min(1),
});

export const SignUpdateSchema = z.object({
  id: z.string().min(1),
  nama_isyarat: z.string().trim().min(1).max(50),
  teks_output: z.string().trim().min(1).max(100),
  kategori: z.enum(KATEGORI).optional(),
  bahasa: z.enum(BAHASA).optional(),
});

export const SignDeleteSchema = z.object({
  id: z.string().min(1),
});

export const CleanSchema = z.object({
  simulasi: z.boolean(),
});

/* ---------- Sensor dua tangan ---------- */
export const SENSOR_DASAR = [
  "IBU_JARI",
  "TELUNJUK",
  "TENGAH",
  "MANIS",
  "KELINGKING",
  "PITCH",
  "ROLL",
] as const;
export type SensorDasar = (typeof SENSOR_DASAR)[number];

// R_ = tangan kanan (master), L_ = tangan kiri (slave)
export const SENSOR_KEYS = [
  "R_IBU_JARI",
  "R_TELUNJUK",
  "R_TENGAH",
  "R_MANIS",
  "R_KELINGKING",
  "R_PITCH",
  "R_ROLL",
  "L_IBU_JARI",
  "L_TELUNJUK",
  "L_TENGAH",
  "L_MANIS",
  "L_KELINGKING",
  "L_PITCH",
  "L_ROLL",
] as const;
export type SensorKey = (typeof SENSOR_KEYS)[number];
export type Tangan = "R" | "L";

export const LABEL_SENSOR_DASAR: Record<SensorDasar, string> = {
  IBU_JARI: "Ibu jari",
  TELUNJUK: "Telunjuk",
  TENGAH: "Jari tengah",
  MANIS: "Jari manis",
  KELINGKING: "Kelingking",
  PITCH: "Kemiringan depan-belakang (pitch)",
  ROLL: "Putaran (roll)",
};

// Jari: 0 (lurus) sampai 100 (tekuk penuh). Pitch/Roll dalam derajat.
const RENTANG_DASAR: Record<SensorDasar, [number, number]> = {
  IBU_JARI: [0, 100],
  TELUNJUK: [0, 100],
  TENGAH: [0, 100],
  MANIS: [0, 100],
  KELINGKING: [0, 100],
  PITCH: [-90, 90],
  ROLL: [-180, 180],
};

export const SENSOR_RANGE = Object.fromEntries(
  SENSOR_KEYS.map((k) => [k, RENTANG_DASAR[k.slice(2) as SensorDasar]])
) as Record<SensorKey, [number, number]>;

export function sensorKey(tangan: Tangan, dasar: SensorDasar): SensorKey {
  return `${tangan}_${dasar}` as SensorKey;
}

// Satu sampel boleh hanya berisi satu tangan, tapi tiap tangan harus lengkap (7 nilai)
const bentukSample = {} as Record<SensorKey, z.ZodOptional<z.ZodNumber>>;
for (const k of SENSOR_KEYS) bentukSample[k] = z.number().min(-360).max(360).optional();

export const SampleSchema = z.object(bentukSample).superRefine((s, ctx) => {
  for (const t of ["R", "L"] as const) {
    const ada = SENSOR_DASAR.filter((d) => s[sensorKey(t, d)] !== undefined).length;
    if (ada !== 0 && ada !== SENSOR_DASAR.length) {
      ctx.addIssue({
        code: "custom",
        message: `Data tangan ${t === "R" ? "kanan" : "kiri"} harus lengkap (7 nilai).`,
      });
    }
  }
  if (SENSOR_KEYS.every((k) => s[k] === undefined)) {
    ctx.addIssue({ code: "custom", message: "Sampel kosong." });
  }
});
export type Sample = z.infer<typeof SampleSchema>;

export const RecordSchema = z.object({
  device_id: z.string().min(1).max(50),
  samples: z.array(SampleSchema).min(5).max(100),
});

export const KondisiSchema = z
  .object({
    sensor: z.enum(SENSOR_KEYS),
    min: z.number(),
    max: z.number(),
  })
  .refine((c) => c.min <= c.max, "Batas minimum tidak boleh lebih besar dari maksimum.");

export const RuleSchema = z.object({
  sign_id: z.string().min(1),
  durasi_tahan_ms: z.number().int().min(100).max(3000),
  kondisi: z.array(KondisiSchema).min(1).max(14),
});

/* ---------- Halaman informasi ---------- */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DIPAKAI_SISTEM = [
  "admin",
  "login",
  "api",
  "kamus",
  "live",
  "latihan",
  "tanya",
  "privasi",
  "pengujian",
];

export const HalamanSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Alamat minimal 2 karakter.")
    .max(60, "Alamat maksimal 60 karakter.")
    .regex(SLUG_RE, "Alamat hanya boleh huruf kecil, angka, dan tanda minus.")
    .refine((s) => !DIPAKAI_SISTEM.includes(s), "Alamat ini dipakai sistem, pilih yang lain."),
  judul: z.string().trim().min(1, "Judul wajib diisi.").max(80, "Judul maksimal 80 karakter."),
  isi: z.string().max(20000, "Isi terlalu panjang."),
  urutan: z.number().int().min(0).max(999),
  tampil: z.boolean(),
});

export const HalamanHapusSchema = z.object({
  slug: z.string().min(1),
});

/* ---------- Asisten AI ---------- */
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

export const AiPerintahSchema = z.object({
  perintah: z.string().trim().min(2).max(4000),
});

export const AksiSchema = z.discriminatedUnion("tipe", [
  z.object({
    tipe: z.literal("kata_tambah"),
    nama_isyarat: z.string().trim().min(1).max(50),
    teks_output: z.string().trim().min(1).max(100),
    kategori: z.enum(KATEGORI).nullish().catch(null),
    bahasa: z.enum(BAHASA).nullish().catch(null),
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
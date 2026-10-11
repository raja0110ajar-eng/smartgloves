import { z } from "zod";
import { KATEGORI } from "./kategori";
import { SENSOR_KEYS } from "./schema";

export const FORMAT = 1;

const Kondisi = z
  .array(
    z
      .object({ sensor: z.enum(SENSOR_KEYS), min: z.number(), max: z.number() })
      .refine((c) => c.min <= c.max)
  )
  .min(1)
  .max(7);

export const SignBackup = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  nama_isyarat: z.string().trim().min(1).max(50),
  teks_output: z.string().trim().min(1).max(100),
  kategori: z.enum(KATEGORI).optional(),
  aktif: z.boolean(),
  kondisi: Kondisi.optional(),
  durasi_tahan_ms: z.number().int().min(100).max(3000).optional(),
  audio_url: z.string().max(500).optional(),
  audio_sumber: z.enum(["mesin", "unggahan"]).optional(),
});
export type SignBackupTipe = z.infer<typeof SignBackup>;

// Entri diperiksa satu per satu di server, jadi satu entri rusak tidak membatalkan semuanya
export const ImporSchema = z.object({
  berkas: z.object({
    format: z.literal(FORMAT),
    signs: z.array(z.unknown()).max(500),
    halaman: z.array(z.unknown()).max(100),
  }),
  mode: z.enum(["lewati", "timpa"]),
  simulasi: z.boolean(),
});

// Alamat audio hanya diterima kalau berasal dari penyimpanan Supabase milik sendiri
export function audioUrlAman(url: string | undefined) {
  const dasar = process.env.SUPABASE_URL;
  if (!url || !dasar) return undefined;
  const awalan = `${dasar.replace(/\/$/, "")}/storage/v1/object/public/audio/`;
  return url.startsWith(awalan) ? url : undefined;
}
import { z } from "zod";

export const EventSchema = z.object({
  sign_id: z.string().min(1).max(50),
  teks: z.string().min(1).max(100),
  device_id: z.string().min(1).max(50),
  timestamp: z.number().int().optional(),
});

export type EventInput = z.infer<typeof EventSchema>;
export const SignCreateSchema = z.object({
  nama_isyarat: z.string().trim().min(1).max(50),
  teks_output: z.string().trim().min(1).max(100),
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
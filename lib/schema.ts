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
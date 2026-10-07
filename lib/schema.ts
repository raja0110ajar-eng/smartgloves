import { z } from "zod";

// Bentuk data yang boleh dikirim sarung tangan
export const EventSchema = z.object({
  sign_id: z.string().min(1),
  device_id: z.string().min(1),
  timestamp: z.number().int(),
});

export type EventInput = z.infer<typeof EventSchema>;
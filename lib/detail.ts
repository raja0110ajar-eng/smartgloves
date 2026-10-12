import { z } from "zod";

export const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

// Gambar hanya diterima dari penyimpanan Supabase milik sendiri (bucket "media")
export function mediaUrlAman(url: string | undefined): string {
  const dasar = process.env.SUPABASE_URL;
  if (!url || !dasar) return "";
  const awalan = `${dasar.replace(/\/$/, "")}/storage/v1/object/public/media/`;
  return url.startsWith(awalan) ? url : "";
}

export const DetailSchema = z
  .object({
    arti: z.string().trim().max(300),
    panduan: z.string().trim().max(600),
    verifikasi: z.object({
      status: z.enum(["belum", "diverifikasi"]),
      oleh: z.string().trim().max(80),
      tanggal: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
    }),
    gambar_url: z.string().max(500),
    gambar_alt: z.string().trim().max(200),
    video_id: z.string().regex(/^([A-Za-z0-9_-]{11})?$/),
    video_deskripsi: z.string().trim().max(500),
  })
  .superRefine((d, ctx) => {
    if (d.verifikasi.status === "diverifikasi" && (!d.verifikasi.oleh || !d.verifikasi.tanggal)) {
      ctx.addIssue({
        code: "custom",
        message: "Status diverifikasi butuh nama pemeriksa dan tanggal.",
        path: ["verifikasi"],
      });
    }
    if (d.gambar_url && !d.gambar_alt) {
      ctx.addIssue({
        code: "custom",
        message: "Gambar wajib punya teks alternatif.",
        path: ["gambar_alt"],
      });
    }
    if (d.video_id && !d.video_deskripsi) {
      ctx.addIssue({
        code: "custom",
        message: "Video wajib punya deskripsi atau transkrip.",
        path: ["video_deskripsi"],
      });
    }
  });

export type Detail = z.infer<typeof DetailSchema>;
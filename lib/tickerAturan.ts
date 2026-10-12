import { z } from "zod";

export const TickerSchema = z.object({
  aktif: z.boolean(),
  pesan: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Pesan tidak boleh kosong.")
        .max(140, "Setiap pesan maksimal 140 karakter.")
    )
    .max(8, "Maksimal 8 pesan."),
});
export type Ticker = z.infer<typeof TickerSchema>;

export const TICKER_BAWAAN: Ticker = {
  aktif: true,
  pesan: [
    "SmartGloves adalah prototipe edukasi untuk isyarat SIBI satu tangan.",
    "Buka Demo Live untuk melihat teks muncul dari gerakan tangan.",
    "Hasil pengujian akurasi dipublikasikan di halaman Pengujian.",
  ],
};

// Dipakai admin sebelum menyimpan: buang baris kosong dan rapikan spasi
export function rapikanPesan(daftar: string[]): string[] {
  return daftar.map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length > 0);
}
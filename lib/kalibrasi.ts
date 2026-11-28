import { z } from "zod";

export const NAMA_JARI = ["Ibu jari", "Telunjuk", "Jari tengah", "Jari manis", "Kelingking"] as const;
export const SELISIH_BAIK_MV = 400; // selisih lurus dan kepalan minimal supaya disebut "baik"
export const SKALA_MV = 3300;
export const MAKS_RIWAYAT = 10;

export type StatusJari = "baik" | "lemah" | "ditolak";

const lima = <T extends z.ZodTypeAny>(t: T) => z.array(t).length(5);

export const DataTanganSchema = z.object({
  lurus: lima(z.number().int().min(0).max(4000)),
  tekuk: lima(z.number().int().min(0).max(4000)),
  diterima: lima(z.number().int().min(0).max(1)),
  alasan: lima(z.number().int().min(0).max(3)),
});
export type DataTangan = z.infer<typeof DataTanganSchema>;

export const KalibrasiSchema = z
  .object({
    device_id: z.string().regex(/^[A-Za-z0-9_-]{1,50}$/),
    sumber: z.enum(["tombol", "web", "serial"]),
    kanan: DataTanganSchema.optional(),
    kiri: DataTanganSchema.optional(),
  })
  .refine((d) => d.kanan || d.kiri, { message: "Tidak ada data tangan." });

const ALASAN = ["", "Sensor hampir tidak berubah", "Jari bergerak saat pengukuran", "Tidak ada data"];

export function nilaiJari(lurus: number, tekuk: number, diterima: number, alasan: number) {
  const selisih = Math.abs(tekuk - lurus);
  if (diterima !== 1) {
    return { selisih, status: "ditolak" as StatusJari, catatan: ALASAN[alasan] || "Ditolak" };
  }
  return selisih >= SELISIH_BAIK_MV
    ? { selisih, status: "baik" as StatusJari, catatan: "Rentang lebar, pembacaan jelas" }
    : { selisih, status: "lemah" as StatusJari, catatan: "Rentang sempit, hasil bisa kurang stabil" };
}

export function olahTangan(t: DataTangan) {
  const jari = NAMA_JARI.map((nama, i) => ({
    nama,
    lurus: t.lurus[i],
    tekuk: t.tekuk[i],
    ...nilaiJari(t.lurus[i], t.tekuk[i], t.diterima[i], t.alasan[i]),
  }));
  const ringkas = { baik: 0, lemah: 0, ditolak: 0 };
  for (const j of jari) ringkas[j.status]++;
  return { jari, ringkas };
}
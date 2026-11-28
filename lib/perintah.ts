import { z } from "zod";
import { BAHASA } from "./bahasa";

export const AKSI_PERINTAH = [
  "bahasa",
  "rekam",
  "kalibrasi",
  "sinkron",
  "volume",
  "putar",
  "bip",
  "kedip",
  "diagnostik",
  "ota",
  "mulai_ulang",
] as const;
export type AksiPerintah = (typeof AKSI_PERINTAH)[number];

export const LABEL_PERINTAH: Record<AksiPerintah, string> = {
  bahasa: "Ganti bahasa",
  rekam: "Rekam pose",
  kalibrasi: "Kalibrasi sensor tekuk",
  sinkron: "Sinkron ruleset dan suara",
  volume: "Atur volume",
  putar: "Putar suara kata",
  bip: "Nada uji speaker",
  kedip: "Kedipkan LED (identifikasi)",
  diagnostik: "Diagnostik",
  ota: "Cek firmware baru",
  mulai_ulang: "Mulai ulang",
};

export const TTL_SESI_MS = 3 * 60_000; // mode cepat aktif selama ini setelah ada perintah
export const POLL_CEPAT_MS = 3000;
export const POLL_NORMAL_MS = 60_000;
export const BATAS_KONFIRMASI_MS = 2 * 60_000;

export const PerintahSchema = z.object({
  device_id: z.string().regex(/^[A-Za-z0-9_-]{1,50}$/),
  aksi: z.enum(AKSI_PERINTAH),
  param: z.union([z.string().max(100), z.number()]).nullish(),
});

export type HasilParam = { ok: true; param: string } | { ok: false; pesan: string };

// Parameter diperiksa dan diubah menjadi teks. Aksi yang tidak butuh parameter mengabaikannya.
export function validasiParam(aksi: AksiPerintah, param: unknown): HasilParam {
  const kosong = param === null || param === undefined || param === "";
  switch (aksi) {
    case "bahasa": {
      const b = String(param ?? "");
      return (BAHASA as readonly string[]).includes(b)
        ? { ok: true, param: b }
        : { ok: false, pesan: "Bahasa harus SIBI atau BISINDO." };
    }
    case "volume": {
      const n = Number(param);
      return !kosong && Number.isInteger(n) && n >= 0 && n <= 21
        ? { ok: true, param: String(n) }
        : { ok: false, pesan: "Volume harus bilangan bulat 0 sampai 21." };
    }
    case "putar": {
      const t = String(param ?? "").trim();
      return t.length >= 1 && t.length <= 60
        ? { ok: true, param: t }
        : { ok: false, pesan: "Teks harus 1 sampai 60 karakter." };
    }
    default:
      return { ok: true, param: "" };
  }
}

// Seberapa sering sarung tangan diminta memeriksa server
export function pollMsUntuk(adaTertunda: boolean, sesiSampaiMs: number, sekarang: number): number {
  return adaTertunda || sesiSampaiMs > sekarang ? POLL_CEPAT_MS : POLL_NORMAL_MS;
}

// Perintah yang sudah diambil tetapi tidak pernah dikonfirmasi dianggap hilang
export function statusEfektif(status: string, diambilMs: number, sekarang: number): string {
  if (status === "dikirim" && diambilMs > 0 && sekarang - diambilMs > BATAS_KONFIRMASI_MS) {
    return "tidak ada konfirmasi";
  }
  return status;
}
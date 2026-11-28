import { z } from "zod";

export const MAKS_PESAN = 300;
export const BATAS_PER_HARI = 3; // pesan per pengunjung per hari
export const JEDA_MS = 20_000;

export const KesanSchema = z.object({
  nama: z.string().trim().max(40).default(""),
  asal: z.string().trim().max(60).default(""),
  pesan: z.string().trim().min(5).max(MAKS_PESAN),
  token: z.string().max(4096).default(""),
  situs: z.string().max(200).default(""), // kolom jebakan: manusia tidak melihatnya, bot mengisinya
});

export function bersihkan(t: string) {
  return t.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
}

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };
const KATA_PENDEK = ["asu", "tai", "babi", "bego", "idiot", "goblok", "tolol", "judi", "slot", "togel", "gacor"];
const KATA_PANJANG = [
  "anjing", "anjir", "bangsat", "bajingan", "kontol", "memek", "ngentot", "jancok", "jancuk",
  "brengsek", "kampret", "sialan", "pantek", "pukimak", "bokep", "porno",
];

// Hasil: alasan kenapa pesan perlu ditinjau admin dulu (tidak boleh langsung tampil), atau null
export function perluTinjau(teks: string): "tautan" | "kontak" | "kata" | "berulang" | null {
  if (/(https?:\/\/|www\.)/i.test(teks)) return "tautan";
  if (/\b[a-z0-9-]+\.(com|id|net|org|xyz|top|io|co|me|link|site|info|biz)\b/i.test(teks)) return "tautan";
  if (/@/.test(teks) || /\d[\d\s().-]{7,}\d/.test(teks)) return "kontak";
  if (/(.)\1{7,}/.test(teks)) return "berulang";

  const norm = teks
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const kata = norm.split(/[^a-z]+/).filter(Boolean);
  if (KATA_PENDEK.some((w) => kata.includes(w))) return "kata";
  const rapat = norm.replace(/[^a-z]/g, "");
  if (KATA_PANJANG.some((w) => rapat.includes(w))) return "kata";
  return null;
}
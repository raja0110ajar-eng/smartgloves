export const KATEGORI = ["huruf", "angka", "kata", "frasa"] as const;
export type Kategori = (typeof KATEGORI)[number];

export const LABEL_KATEGORI: Record<Kategori, string> = {
  huruf: "Huruf",
  angka: "Angka",
  kata: "Kata",
  frasa: "Frasa",
};
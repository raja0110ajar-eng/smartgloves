export const BAHASA = ["SIBI", "BISINDO"] as const;
export type Bahasa = (typeof BAHASA)[number];

// Data lama tidak punya field bahasa dan dianggap SIBI
export function normBahasa(v: unknown): Bahasa {
  return v === "BISINDO" ? "BISINDO" : "SIBI";
}

// Kata yang sama boleh ada di dua bahasa, tapi tidak dua kali dalam satu bahasa
export function kunciKata(bahasa: Bahasa, slugTeks: string) {
  return `${bahasa}:${slugTeks}`;
}

export function idKata(bahasa: Bahasa, slugTeks: string) {
  return `${bahasa.toLowerCase()}-${slugTeks}`;
}
// Perangkat dianggap online kalau terlihat dalam batas ini
export const BATAS_ONLINE_DETIK = 150;

export type KondisiPerangkat = "belum" | "online" | "putus";

export function kondisiPerangkat(detikLalu: number | null): KondisiPerangkat {
  if (detikLalu === null) return "belum";
  return detikLalu <= BATAS_ONLINE_DETIK ? "online" : "putus";
}

export function teksDurasi(detik: number): string {
  const s = Math.max(0, Math.round(detik));
  if (s < 10) return "baru saja";
  if (s < 60) return `${s} detik lalu`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const j = Math.round(m / 60);
  if (j < 24) return `${j} jam lalu`;
  return `${Math.round(j / 24)} hari lalu`;
}
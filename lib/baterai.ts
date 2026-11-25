// Kurva tegangan LiPo 1S, perkiraan kasar pada beban ringan. Tegangan turun saat Wi-Fi memancar,
// jadi persentase hanya petunjuk, bukan pengukuran yang tepat.
const TITIK: [number, number][] = [
  [4200, 100],
  [4100, 90],
  [4000, 80],
  [3900, 65],
  [3800, 50],
  [3700, 35],
  [3600, 20],
  [3500, 10],
  [3300, 0],
];

export function persenBaterai(mv: unknown): number | null {
  if (typeof mv !== "number" || !Number.isFinite(mv) || mv < 2500 || mv > 4500) return null;
  if (mv >= TITIK[0][0]) return 100;
  if (mv <= TITIK[TITIK.length - 1][0]) return 0;
  for (let i = 1; i < TITIK.length; i++) {
    const [v1, p1] = TITIK[i - 1];
    const [v2, p2] = TITIK[i];
    if (mv >= v2) return Math.round(p2 + ((mv - v2) / (v1 - v2)) * (p1 - p2));
  }
  return 0;
}
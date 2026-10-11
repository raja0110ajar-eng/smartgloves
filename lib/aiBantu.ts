export class GalatHttp extends Error {
  status: number;
  constructor(status: number, pesan: string) {
    super(pesan);
    this.status = status;
  }
}

export function statusDari(e: unknown): number | undefined {
  const s = (e as { status?: unknown })?.status;
  return typeof s === "number" ? s : undefined;
}

export function pesanDari(e: unknown): string {
  return (e instanceof Error ? e.message : "Kesalahan tidak dikenal").slice(0, 200);
}

// Ambil objek JSON dari teks jawaban, walau dibungkus ```json atau ada kalimat pembuka
export function ekstrakJson(teks: string): unknown {
  const bersih = teks.replace(/```json|```/gi, "").trim();
  const awal = bersih.indexOf("{");
  const akhir = bersih.lastIndexOf("}");
  if (awal === -1 || akhir <= awal) throw new Error("Jawaban bukan JSON.");
  return JSON.parse(bersih.slice(awal, akhir + 1));
}
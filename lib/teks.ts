// Jumlah perubahan minimal (tambah, hapus, ganti satu huruf) untuk mengubah a menjadi b
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let sebelum = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const sekarang = [i];
    for (let j = 1; j <= b.length; j++) {
      const biaya = a[i - 1] === b[j - 1] ? 0 : 1;
      sekarang[j] = Math.min(
        sebelum[j] + 1,
        sekarang[j - 1] + 1,
        sebelum[j - 1] + biaya
      );
    }
    sebelum = sekarang;
  }
  return sebelum[b.length];
}

// Cari kata terdekat dari daftar kandidat. Kalau ada dua kandidat sama dekatnya
// (koreksi ambigu), tidak dipaksakan dan hasilnya null.
export function koreksiKata(
  masukan: string,
  kandidat: string[],
  maksJarak = 1
): { kata: string; jarak: number } | null {
  const m = masukan.toLowerCase();
  let terbaik: { kata: string; jarak: number } | null = null;
  let kembar = false;

  for (const k of kandidat) {
    const jarak = levenshtein(m, k.toLowerCase());
    if (jarak > maksJarak) continue;
    if (!terbaik || jarak < terbaik.jarak) {
      terbaik = { kata: k, jarak };
      kembar = false;
    } else if (jarak === terbaik.jarak && k !== terbaik.kata) {
      kembar = true;
    }
  }
  if (terbaik && terbaik.jarak > 0 && kembar) return null;
  return terbaik;
}
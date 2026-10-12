const MAKS_BYTE = 250 * 1024;

// Mengecilkan foto dan mengubahnya menjadi WebP. Karena gambar dibuat ulang lewat kanvas,
// metadata foto (termasuk lokasi GPS) ikut terbuang.
export async function ubahKeWebp(file: File, maksSisi = 1024): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error("File ini tidak bisa dibaca sebagai gambar. Coba JPG, PNG, atau WebP.");
  }

  const skala = Math.min(1, maksSisi / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * skala));
  const h = Math.max(1, Math.round(bmp.height * skala));
  const kanvas = document.createElement("canvas");
  kanvas.width = w;
  kanvas.height = h;
  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new Error("Browser ini tidak mendukung pemrosesan gambar.");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  for (const kualitas of [0.8, 0.65, 0.5]) {
    const blob = await new Promise<Blob | null>((res) =>
      kanvas.toBlob(res, "image/webp", kualitas)
    );
    if (!blob || blob.type !== "image/webp") {
      throw new Error("Browser ini tidak bisa membuat gambar WebP. Coba Chrome atau Edge.");
    }
    if (blob.size <= MAKS_BYTE) return blob;
  }
  throw new Error("Gambar masih terlalu besar setelah dikompres. Pakai foto yang lebih kecil.");
}
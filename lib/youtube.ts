// Mengambil ID video (11 karakter) dari berbagai bentuk tautan YouTube
export function idYoutube(url: string): string | null {
  const m = url
    .trim()
    .match(
      /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#].*)?$/
    );
  return m ? m[1] : null;
}
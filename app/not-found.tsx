import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hero">
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat yang kamu buka tidak ada atau sudah dipindahkan.</p>
      <div className="aksi">
        <Link href="/" className="tombol utama">
          Ke beranda
        </Link>
        <Link href="/kamus" className="tombol">
          Kamus isyarat
        </Link>
      </div>
    </main>
  );
}
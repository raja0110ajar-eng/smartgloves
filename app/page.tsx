import Link from "next/link";

export default function Beranda() {
  return (
    <main>
      <section className="hero">
        <h1>SmartGloves</h1>
        <p>
          Sarung tangan pintar yang menerjemahkan isyarat tangan SIBI menjadi
          teks dan suara secara langsung.
        </p>
        <div className="aksi">
          <Link href="/live" className="tombol utama">
            Lihat Demo Live
          </Link>
          <Link href="/kamus" className="tombol">
            Kamus Isyarat
          </Link>
        </div>
      </section>

      <section className="kontainer bagian">
        <h2>Cara kerjanya</h2>
        <div className="grid3">
          <div className="kartu">
            <h3>1. Membaca isyarat</h3>
            <p>
              Sensor tekuk di setiap jari dan sensor gerak di punggung tangan
              membaca bentuk jari serta arah tangan.
            </p>
          </div>
          <div className="kartu">
            <h3>2. Mengenali kata</h3>
            <p>
              Mikrokontroler ESP32 mencocokkan pose dengan kamus isyarat yang
              tersimpan di dalam sarung tangan.
            </p>
          </div>
          <div className="kartu">
            <h3>3. Teks dan suara</h3>
            <p>
              Kata yang dikenali tampil sebagai teks di layar web dan
              diucapkan lewat speaker kecil pada sarung tangan.
            </p>
          </div>
        </div>
      </section>

      <section className="kontainer bagian">
        <div className="kartu">
          <h3>Cakupan prototipe</h3>
          <p>
            Proyek ini memakai isyarat SIBI (Sistem Isyarat Bahasa Indonesia)
            dengan satu tangan, dan fokus pada huruf serta kata dasar. SmartGloves
            adalah prototipe edukasi, bukan pengganti juru bahasa isyarat.
          </p>
        </div>
      </section>
    </main>
  );
}
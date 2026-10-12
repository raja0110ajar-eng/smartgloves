import Link from "next/link";
import { BookOpen, MessageCircle, Radio, Target } from "lucide-react";
import { adminDb } from "@/lib/firebaseAdmin";
import { KAMUS_HANYA_SIAP } from "@/lib/kamusAturan";

export const revalidate = 600;

async function hitungIsyarat(): Promise<number> {
  try {
    const snap = await adminDb
      .collection("signs")
      .where("aktif", "==", true)
      .select("kondisi")
      .get();
    return snap.docs.filter((d) => {
      const k = d.data().kondisi;
      return !KAMUS_HANYA_SIAP || (Array.isArray(k) && k.length > 0);
    }).length;
  } catch {
    return 0;
  }
}

const LANGKAH = [
  {
    judul: "Membaca isyarat",
    isi: "Lima sensor tekuk di jari dan satu sensor gerak di punggung tangan mengukur bentuk jari dan arah tangan.",
  },
  {
    judul: "Mencocokkan dengan kamus",
    isi: "Mikrokontroler ESP32 di sarung tangan membandingkan bacaan itu dengan pola isyarat yang sudah direkam, lalu memilih yang paling cocok.",
  },
  {
    judul: "Menampilkan dan mengucapkan",
    isi: "Kata yang dikenali muncul di layar web dan diucapkan lewat speaker, disertai skor seberapa dekat posenya.",
  },
];

const FITUR = [
  {
    href: "/live",
    Ikon: Radio,
    judul: "Demo Live",
    isi: "Lihat teks muncul saat sarung tangan mengenali isyarat, lengkap dengan suara dan skor kecocokan.",
  },
  {
    href: "/latihan",
    Ikon: Target,
    judul: "Latihan isyarat",
    isi: "Peragakan isyarat yang diminta dan kumpulkan bintang, dari level dasar sampai Time Attack.",
  },
  {
    href: "/kamus",
    Ikon: BookOpen,
    judul: "Kamus isyarat",
    isi: "Cari isyarat yang sudah terdaftar, dengarkan ucapannya, dan baca penjelasannya.",
  },
  {
    href: "/tanya",
    Ikon: MessageCircle,
    judul: "Tanya SmartGloves",
    isi: "Tanyakan cara kerja dan isi situs ini. Dijawab asisten AI, dengan tautan ke halaman sumbernya.",
  },
];

export default async function Beranda() {
  const jumlah = await hitungIsyarat();

  return (
    <main>
      <div className="kontainer">
        <section className="hb" aria-labelledby="judul-utama">
          <div>
            <h1 id="judul-utama" className="hb-judul">
              Isyarat tangan jadi teks dan suara.
            </h1>
            <p className="hb-lead">
              SmartGloves membaca bentuk jari dan arah tangan, mencocokkannya dengan kamus isyarat
              SIBI, lalu menampilkan dan mengucapkan hasilnya.
            </p>
            <div className="hb-aksi">
              <Link href="/live" className="tombol utama">
                Buka Demo Live
              </Link>
              <Link href="/latihan" className="tombol">
                Latihan isyarat
              </Link>
            </div>
            <p className="hb-catatan">
              {jumlah > 0
                ? `Saat ini ${jumlah} isyarat SIBI satu tangan terdaftar di kamus.`
                : "Kamus isyarat sedang disiapkan."}
            </p>
          </div>

          <div
            className="layar"
            role="img"
            aria-label="Contoh tampilan Demo Live: kata Halo, Terima kasih, lalu Tolong muncul bergantian beserta skor kecocokan."
          >
            <div className="layar-atas" aria-hidden="true">
              <span className="titik contoh" />
              <span>Contoh tampilan Demo Live</span>
            </div>
            <div className="layar-kata" aria-hidden="true">
              <span className="h-k h-k1">Halo</span>
              <span className="h-k h-k2">Terima kasih</span>
              <span className="h-k h-k3">Tolong</span>
            </div>
            <div aria-hidden="true">
              <div className="layar-skor-teks">
                <span>Kecocokan pose</span>
                <span className="layar-angka">
                  <span className="h-s h-s1">92%</span>
                  <span className="h-s h-s2">88%</span>
                  <span className="h-s h-s3">95%</span>
                </span>
              </div>
              <div className="skor-bar">
                <div className="h-bar" />
              </div>
            </div>
            <ul className="layar-kalimat" aria-hidden="true">
              <li className="h-chip h-c1">Halo</li>
              <li className="h-chip h-c2">Terima kasih</li>
              <li className="h-chip h-c3">Tolong</li>
            </ul>
          </div>
        </section>
      </div>

      <section className="kontainer bagian" aria-labelledby="judul-cara">
        <h2 id="judul-cara">Cara kerjanya</h2>
        <ol className="langkah">
          {LANGKAH.map((l, i) => (
            <li key={l.judul}>
              <span className="langkah-no" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{l.judul}</h3>
              <p>{l.isi}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="kontainer bagian" aria-labelledby="judul-fitur">
        <h2 id="judul-fitur">Yang bisa kamu coba</h2>
        <ul className="fitur">
          {FITUR.map(({ href, Ikon, judul, isi }) => (
            <li key={href}>
              <Link href={href}>
                <span className="fitur-ikon">
                  <Ikon size={22} aria-hidden="true" />
                </span>
                <span>
                  <strong>{judul}</strong>
                  <span className="fitur-teks">{isi}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="kontainer bagian" aria-labelledby="judul-cakupan">
        <h2 id="judul-cakupan">Cakupan prototipe</h2>
        <p style={{ color: "var(--redup)", maxWidth: "40rem" }}>
          SmartGloves masih dalam pengembangan. Kami lebih memilih menyebut batasnya dengan jelas
          daripada menjanjikan terlalu banyak.
        </p>
        <div className="cakupan">
          <div>
            <h3>Yang dirancang bisa</h3>
            <ul>
              <li>Membaca bentuk jari dan kemiringan satu tangan.</li>
              <li>Mengenali isyarat SIBI yang sudah direkam di kamus.</li>
              <li>Menampilkan teksnya dan mengucapkannya.</li>
              <li>Membantu belajar lewat latihan dan kamus.</li>
            </ul>
          </div>
          <div>
            <h3>Yang belum bisa</h3>
            <ul>
              <li>Isyarat yang memakai dua tangan.</li>
              <li>Ekspresi wajah dan posisi tangan terhadap tubuh.</li>
              <li>Gerakan rumit yang berubah terhadap waktu.</li>
              <li>Menggantikan juru bahasa isyarat.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="kontainer" aria-labelledby="judul-ajakan">
        <div className="ajakan">
          <div>
            <h2 id="judul-ajakan">Lihat teks muncul dari gerakan tangan.</h2>
            <p>Buka Demo Live di layar besar, dan nyalakan suaranya kalau mau.</p>
          </div>
          <Link href="/live" className="tombol terang">
            Buka Demo Live
          </Link>
        </div>
      </section>
    </main>
  );
}
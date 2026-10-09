export const CONTOH = [
  {
    slug: "cara-kerja",
    judul: "Cara Kerja",
    urutan: 10,
    isi: `## Dari isyarat sampai suara

SmartGloves bekerja dalam tiga tahap.

1. **Membaca.** Lima sensor tekuk (flex) mengukur seberapa bengkok tiap jari, dan sensor gerak MPU6050 mengukur kemiringan tangan.
2. **Mengenali.** Mikrokontroler ESP32 membandingkan bacaan sensor dengan daftar pose yang tersimpan di dalamnya. Kalau cocok dan pose ditahan sebentar, kata itu dianggap terdeteksi.
3. **Menyampaikan.** Kata yang terdeteksi diucapkan lewat speaker, dan dikirim ke web lewat internet sehingga tampil sebagai teks di halaman Demo Live.

## Kamus yang bisa diubah

Daftar pose tidak ditulis mati di dalam sarung tangan. Admin merekam pose lewat halaman web, dan sarung tangan dirancang untuk mengunduh daftar terbarunya sendiri saat menyala, jadi kosakata bisa ditambah tanpa memprogram ulang.

## Batasan

Sarung tangan satu tangan hanya bisa membaca bentuk jari dan kemiringan tangan. Isyarat yang melibatkan dua tangan, posisi terhadap wajah, atau gerakan rumit belum didukung.
`,
  },
  {
    slug: "bahan",
    judul: "Bahan",
    urutan: 20,
    isi: `## Perangkat keras

- **ESP32-C3**: otak sarung tangan, membaca sensor, mencocokkan pose, dan terhubung ke WiFi.
- **Flex sensor (5 buah)**: satu per jari, mengukur tingkat tekukan.
- **MPU6050**: sensor gerak untuk kemiringan dan gerakan tangan.
- **MAX98357A**: penguat audio kecil yang mengubah data suara digital menjadi sinyal untuk speaker.
- **Speaker kecil**: mengucapkan kata yang terdeteksi.
- **Tombol kecil**: penanda akhir kalimat dan pemicu mode rekam.

## Perangkat lunak dan layanan

- **Next.js dan Vercel**: membangun dan meng-host website.
- **Firebase (Firestore dan Authentication)**: menyimpan data kata, menyiarkan teks secara langsung, dan login admin.
- **Supabase Storage**: menyimpan file suara.
- **Edge-TTS**: membuat suara bahasa Indonesia dari teks.
- **Gemini**: membantu admin menyusun daftar kata.
`,
  },
  {
    slug: "tentang",
    judul: "Tentang",
    urutan: 30,
    isi: `## Tentang proyek

SmartGloves adalah prototipe sarung tangan pintar yang menerjemahkan isyarat tangan SIBI menjadi teks dan suara. [Tulis latar belakang dan tujuan proyek di sini.]

## SIBI dan cakupan proyek

SIBI (Sistem Isyarat Bahasa Indonesia) adalah sistem isyarat baku yang dipakai di lingkungan pendidikan. Banyak komunitas Tuli di Indonesia sehari-hari memakai BISINDO (Bahasa Isyarat Indonesia), yang tidak sama dengan SIBI. Proyek ini memakai SIBI, dengan satu tangan, dan fokus pada huruf serta kata dasar.

SmartGloves adalah prototipe edukasi dan bukan pengganti juru bahasa isyarat.

## Tim

[Isi nama tim dan peran masing-masing di sini.]
`,
  },
];
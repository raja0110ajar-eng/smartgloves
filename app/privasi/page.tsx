export const metadata = { title: "Privasi, SmartGloves" };

export default function PrivasiPage() {
  return (
    <main className="kontainer bagian">
      <h1>Privasi</h1>
      <div className="markdown">
        <p>
          Halaman ini menjelaskan, secara singkat dan teknis, data apa yang diproses SmartGloves.
          Ini bukan nasihat hukum.
        </p>

        <h2>Data dari sarung tangan</h2>
        <p>
          Saat isyarat terdeteksi, yang disimpan hanya teks hasil deteksi, kode perangkat, waktu,
          dan skor kecocokan. Tidak ada data pribadi di dalamnya. Data ini bersifat publik dan
          tampil di halaman Demo Live.
        </p>

        <h2>Pengunjung</h2>
        <p>
          Situs ini tidak meminta akun pengunjung dan tidak memasang cookie pelacak atau iklan
          sendiri. Pengaturan tampilan (tema, ukuran teks, kontras) dan progres latihan disimpan di
          penyimpanan lokal browser kamu dan tidak dikirim ke server kami.
        </p>

        <h2>Tanya SmartGloves</h2>
        <p>
          Pertanyaanmu dikirim ke penyedia AI (Google Gemini, dan jika diaktifkan, OpenRouter) agar
          bisa dijawab. Situs ini tidak menyimpan teks pertanyaanmu. Jawaban umum disimpan sementara
          tanpa teks pertanyaan supaya tidak perlu dibuat ulang. Alamat IP hanya diubah menjadi kode
          acak (hash) untuk membatasi jumlah pertanyaan per hari. Penyedia AI punya kebijakan data
          masing-masing, jadi jangan menulis data pribadi di sana.
        </p>

        <h2>Verifikasi keamanan</h2>
        <p>
          Cloudflare Turnstile dipakai untuk memastikan penanya adalah manusia, dan dapat memproses
          data teknis browser sesuai kebijakan Cloudflare.
        </p>

        <h2>Admin</h2>
        <p>Perubahan data oleh admin dicatat (akun, waktu, dan jenis aksi) untuk keperluan keamanan.</p>

        <h2>Layanan pihak ketiga</h2>
        <p>
          Vercel (hosting), Google Firebase (database dan login admin), Supabase (file audio),
          Google dan OpenRouter (AI), serta Cloudflare (verifikasi).
        </p>

        <h2>Kontak</h2>
        <p>[Isi kontak tim, misalnya alamat email.]</p>
      </div>
    </main>
  );
}
# Protokol pengujian akurasi

## Tujuan
Mengukur seberapa sering sarung tangan mengenali isyarat yang benar, dan seberapa cepat.

## Persiapan
- Sarung tangan sudah dikalibrasi dan semua isyarat yang diuji sudah direkam (Mode Rekam).
- Catat versi ruleset (otomatis tercatat) dan kondisi ruangan.
- Penguji setuju datanya dipakai dan diberi kode anonim (P1, P2, ...).
- Targetkan minimal 3 penguji berbeda, dan 10 sampai 20 percobaan per isyarat per penguji.

## Pelaksanaan (Admin > Evaluasi)
1. Isi kode penguji dan kondisi, pilih isyarat, tentukan jumlah ulangan, lalu mulai.
2. Penguji memperagakan isyarat yang tampil. Deteksi pertama dalam 8 detik dicatat.
3. Lepaskan pose saat jeda 2 detik.
4. Simpan sesi di akhir. Sesi yang memakai simulator tidak dihitung dalam statistik publik.

## Pelaporan
- Laporkan akurasi beserta rentang kepercayaan 95%, jumlah percobaan, jumlah penguji, dan kondisi uji.
- Laporkan juga isyarat yang sering tertukar dan yang sering tidak terdeteksi, bukan hanya yang berhasil.
- Waktu deteksi mencakup waktu penguji membentuk pose. Untuk kecepatan murni sistem, ukur dari
  firmware (waktu dari pose stabil sampai suara mulai).

## Target awal (hipotesis, sesuaikan setelah ada data)
- Akurasi per isyarat 90% atau lebih untuk pose statis
- Median waktu sampai deteksi di bawah 2 detik
- Pasangan isyarat yang sering tertukar diperbaiki (rekam ulang atau persempit toleransi), atau dikeluarkan dari cakupan
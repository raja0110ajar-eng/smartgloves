# Kontrak API untuk firmware SmartGloves

Semua panggilan memakai HTTPS dan header `Authorization: Bearer <DEVICE_TOKEN>`.

## 1. Cek ruleset sekaligus tanda hidup
`GET /api/ruleset?versi=<versi lokal>&device_id=<id>&fw=<versi firmware>&rssi=<dBm>`

- Panggil saat boot, lalu setiap 60 sampai 120 detik.
- `200 {"versi":12,"berubah":false}`: tidak ada yang perlu diunduh.
- `200 {"versi":13,"berubah":true,"statis":[...]}`: simpan ke LittleFS dan perbarui versi lokal.
- `401`: token salah. `5xx` atau timeout: coba lagi dengan jeda bertahap (5 dtk, 15 dtk, 1 mnt, 5 mnt).
- Server menganggap perangkat online kalau ada panggilan dalam 150 detik terakhir.

## 2. Kirim event (kata terdeteksi)
`POST /api/event`
```json
{"sign_id":"halo","teks":"Halo","device_id":"glove_01","skor":87}
```
- `skor` (0 sampai 100) opsional, lihat rumus di bagian 5.
- `200 {"ok":true}`, `400` format salah, `401` token salah.
- `429` batas event harian tercapai: berhenti mengirim sampai hari berikutnya (WIB). Suara lokal tetap jalan.
- Putar audio lebih dulu, baru kirim event. Jangan menunda suara menunggu server.
- Kalau jaringan gagal, buang atau antrekan paling banyak 10 event terbaru.

## 3. Kirim rekaman pose (Mode Rekam)
`POST /api/record`
```json
{"device_id":"glove_01","samples":[{"IBU_JARI":8,"TELUNJUK":80,"TENGAH":78,"MANIS":82,"KELINGKING":79,"PITCH":5,"ROLL":0}]}
```
- 5 sampai 100 sampel dalam satu permintaan.
- Jari: 0 (lurus) sampai 100 (tekuk penuh). `PITCH`: -90 sampai 90. `ROLL`: -180 sampai 180.

## 4. Format ruleset
```json
{"versi":13,"statis":[{"sign_id":"halo","teks":"Halo","durasi_tahan_ms":400,
 "kondisi":[{"sensor":"TELUNJUK","min":70,"max":90}],"audio_url":"https://.../halo.mp3?v=..."}]}
```
- Sebuah rule cocok kalau SEMUA kondisinya terpenuhi dan pose ditahan selama `durasi_tahan_ms`.
- Kalau beberapa rule cocok, pilih yang kondisinya paling banyak.
- Kata yang sama baru boleh dikirim lagi setelah pose dilepas.

## 5. Skor kecocokan
Untuk tiap kondisi: `tengah=(min+max)/2`, `setengah=max((max-min)/2,1)`,
`jarak=min(|nilai-tengah|/setengah,1)`, `skor_kondisi=1-0.5*jarak`.
`skor = round(rata-rata(skor_kondisi) * 100)`. Nilai 50 berarti tepat di tepi rentang, 100 tepat di tengah.
Logika yang sama ada di `lib/pose.ts` (fungsi `hitungSkor`) dan sudah punya tes.

## 6. Audio
- Unduh `audio_url` saat versi ruleset berubah, simpan sebagai `<sign_id>.mp3` di LittleFS.
- Format MP3 mono 16 kHz 32 kbps. Kalau URL berubah (parameter `?v=`), unduh ulang.

## 7. Kalibrasi
Normalisasi tiap jari ke 0 sampai 100 memakai nilai ADC saat jari lurus dan tekuk penuh. Simpan di perangkat.
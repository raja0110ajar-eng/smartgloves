# Kontrak API dan firmware SmartGloves (dua tangan, SIBI dan BISINDO)

## 1. Peran perangkat
- **Master (tangan kanan)**: terhubung ke Wi-Fi dan server, membaca sensor tangan kanan, menerima data
  tangan kiri lewat ESP-NOW, menggabungkan, mencocokkan pose, memutar suara, dan mengirim event.
- **Slave (tangan kiri)**: hanya membaca sensor tangan kiri dan mengirim paket ke master lewat ESP-NOW.
  Tidak terhubung ke internet dan tidak memutar suara.

Semua panggilan master ke server memakai HTTPS dan header `Authorization: Bearer <DEVICE_TOKEN>`.

## 2. Nama sensor
Tiap tangan punya 7 nilai. Awalan `R_` untuk tangan kanan dan `L_` untuk tangan kiri:
`IBU_JARI, TELUNJUK, TENGAH, MANIS, KELINGKING` (0 lurus sampai 100 tekuk penuh),
`PITCH` (-90 sampai 90 derajat), `ROLL` (-180 sampai 180 derajat).
Contoh: `R_TELUNJUK`, `L_ROLL`. Tiap tangan dikalibrasi sendiri (nilai jari dinormalisasi ke 0 sampai 100
di perangkat masing-masing sebelum dikirim atau dicocokkan).

## 3. ESP-NOW (slave ke master)
Paket (little-endian, tanpa padding):
```c
typedef struct __attribute__((packed)) {
  uint8_t  versi;      // 1
  uint8_t  seq;        // naik tiap paket, berputar 0..255
  uint8_t  jari[5];    // 0..100: ibu jari, telunjuk, tengah, manis, kelingking
  int16_t  pitch_x10;  // derajat x 10
  int16_t  roll_x10;   // derajat x 10
  uint16_t batt_mv;    // tegangan baterai (mV)
} PaketTangan;         // 15 byte
```
- Slave mengirim 25 sampai 50 kali per detik (cukup 25).
- Master menganggap data kiri VALID kalau paket terakhir berumur 250 ms atau kurang. Kalau tidak,
  semua sensor `L_` dianggap tidak ada: aturan yang memakai tangan kiri tidak boleh cocok.
- MAC master dituliskan di slave (atau lewat pairing sekali). Master mendaftarkan MAC slave sebagai peer.
- **Kanal harus sama.** Saat master terhubung ke Wi-Fi (mode STA), ESP-NOW hanya bekerja di kanal Wi-Fi
  itu. Slave harus memakai kanal yang sama. Pendekatan: master menyiarkan paket "sapa" berisi nomor
  kanalnya, dan slave memindai kanal 1 sampai 13 sampai menerima sapaan itu. Hotspot ponsel bisa
  berganti kanal, jadi slave harus bisa mencari ulang bila paket berhenti. Uji ini lebih awal.

## 4. Bahasa aktif
- Sarung tangan punya satu bahasa aktif: `SIBI` atau `BISINDO` (disimpan di memori perangkat).
- Tombol di master: tekan lama (sekitar 1,5 detik) untuk berganti bahasa, beri tanda suara atau LED.
- Master hanya mencocokkan aturan yang `bahasa`-nya sama dengan bahasa aktif.
  Bahasa awal boleh `SIBI` kalau belum pernah diatur.

## 5. Cek ruleset sekaligus tanda hidup (master)
`GET /api/ruleset?versi=<lokal>&device_id=<id>&fw=<versi>&rssi=<dBm>&kiri=<0|1>&vk=<mV>&vi=<mV>&bhs=<SIBI|BISINDO>`
- `kiri` = 1 kalau data tangan kiri valid, `vk` baterai kanan, `vi` baterai kiri (dari paket terakhir),
  `bhs` bahasa aktif. Semua opsional kecuali `device_id`, tapi sebaiknya selalu dikirim.
- Panggil saat boot, lalu setiap 60 sampai 120 detik.
- `200 {"versi":12,"berubah":false}`: tidak ada yang perlu diunduh.
- `200 {"versi":13,"berubah":true,"statis":[...]}`: simpan ke LittleFS dan perbarui versi lokal.
- `401` token salah. `5xx` atau timeout: coba lagi dengan jeda bertahap (5 dtk, 15 dtk, 1 mnt, 5 mnt).

## 6. Format ruleset
```json
{"versi":13,"statis":[
 {"sign_id":"sibi-halo","teks":"Halo","bahasa":"SIBI","durasi_tahan_ms":400,
  "kondisi":[{"sensor":"R_TELUNJUK","min":70,"max":90}],"audio_url":"https://.../halo.mp3?v=..."},
 {"sign_id":"bisindo-terima-kasih","teks":"Terima kasih","bahasa":"BISINDO","durasi_tahan_ms":500,
  "kondisi":[{"sensor":"R_TELUNJUK","min":10,"max":30},{"sensor":"L_TELUNJUK","min":10,"max":30}],
  "audio_url":null}
]}
```
Aturan pencocokan (di master, tiap siklus sekitar 50 Hz):
1. Gabungkan 14 nilai: `R_` dari sensor sendiri, `L_` dari paket slave yang valid.
2. Ambil aturan dengan `bahasa` = bahasa aktif. Sebuah aturan cocok kalau SEMUA kondisinya terpenuhi.
   Kondisi pada sensor yang tidak ada (tangan kiri terputus) berarti tidak cocok.
3. Kalau beberapa aturan cocok, pilih yang kondisinya paling banyak.
4. Kata dianggap terdeteksi kalau aturan yang sama tetap cocok selama `durasi_tahan_ms`.
5. Kata yang sama baru boleh terdeteksi lagi setelah tidak ada aturan yang cocok selama 200 ms ("lepas dulu").

## 7. Kirim event (master)
`POST /api/event`
```json
{"sign_id":"bisindo-terima-kasih","teks":"Terima kasih","bahasa":"BISINDO","device_id":"glove_01","skor":87}
```
- `skor` 0 sampai 100 dan `bahasa` opsional tapi sebaiknya dikirim. Rumus skor di bagian 9.
- `200 {"ok":true}`, `400` format salah, `401` token salah.
- `429` batas event harian tercapai: berhenti mengirim sampai hari berikutnya (WIB). Suara lokal tetap jalan.
- Putar audio lebih dulu, baru kirim event. Jangan menunda suara menunggu server.
- Kalau jaringan gagal, buang atau antrekan paling banyak 10 event terbaru.

## 8. Kirim rekaman pose (master, Mode Rekam)
`POST /api/record`
```json
{"device_id":"glove_01","samples":[
 {"R_IBU_JARI":8,"R_TELUNJUK":80,"R_TENGAH":78,"R_MANIS":82,"R_KELINGKING":79,"R_PITCH":5,"R_ROLL":0,
  "L_IBU_JARI":60,"L_TELUNJUK":15,"L_TENGAH":18,"L_MANIS":20,"L_KELINGKING":25,"L_PITCH":-10,"L_ROLL":12}
]}
```
- 5 sampai 100 sampel per permintaan. Tiap sampel boleh hanya berisi satu tangan, tapi tiap tangan
  harus lengkap (7 nilai). Kalau tangan kiri tidak valid saat merekam, kirim hanya nilai `R_`.
- Mulai merekam dengan menahan tombol, kumpulkan 2 sampai 3 detik, lalu kirim satu permintaan.

## 9. Skor kecocokan
Untuk tiap kondisi: `tengah=(min+max)/2`, `setengah=max((max-min)/2,1)`,
`jarak=min(|nilai-tengah|/setengah,1)`, `skor_kondisi=1-0.5*jarak`.
`skor = round(rata-rata(skor_kondisi) * 100)`. Nilai 50 berarti tepat di tepi rentang, 100 tepat di tengah.
Logika yang sama ada di `lib/pose.ts` (fungsi `hitungSkor` dan `cocokkanPose`) dan sudah punya tes.

## 10. Audio
- Unduh `audio_url` saat versi ruleset berubah, simpan sebagai `<sign_id>.mp3` di LittleFS master.
- Format MP3 mono 16 kHz 32 kbps. Kalau URL berubah (parameter `?v=`), unduh ulang.
- Hanya master yang punya speaker. Slave tidak memutar suara.

## 11. Kegagalan yang harus ditangani
- Slave mati atau di luar jangkauan: lanjutkan dengan tangan kanan saja, kirim `kiri=0`.
- Paket ESP-NOW hilang: pakai paket terakhir selama 250 ms, setelah itu anggap tidak ada.
- Kanal berubah: slave mencari ulang master (lihat bagian 3).
- Server tidak terjangkau: suara lokal tetap berbunyi, event dibuang atau diantrekan.
# SmartGloves

Prototipe sarung tangan pintar yang menerjemahkan isyarat tangan SIBI menjadi teks dan suara,
dengan website untuk tampilan langsung, kamus isyarat, latihan, dan pengelolaan oleh admin.

> Prototipe edukasi, bukan pengganti juru bahasa isyarat. Cakupan: satu tangan, huruf dan kata dasar SIBI.

## Fitur
- Demo live: teks real-time, suara dari browser, riwayat kalimat, skor kecocokan pose
- Kamus isyarat dengan pencarian dan filter kategori
- Latihan: level bertahap, Time Attack, Eja Kata dengan koreksi ejaan (Levenshtein)
- Tanya SmartGloves: asisten AI yang menjawab dari isi situs
- Admin: kata (CRUD), Mode Rekam pose, audio, halaman informasi, asisten AI, cadangan, log

## Arsitektur
```mermaid
flowchart LR
  G[ESP32 + sensor] -->|HTTPS + token| V[Vercel / Next.js]
  V --> F[(Firestore)]
  V --> S[(Supabase Storage)]
  F -->|onSnapshot| B[Browser publik]
  A[Admin] --> V
  V --> AI[Gemini / OpenRouter]
```

## Menjalankan
1. `npm install`
2. Salin `.env.example` menjadi `.env.local`, lalu isi nilainya
3. `npm run dev`, buka http://localhost:3000
4. `npm test` untuk tes otomatis

## Keamanan singkat
- Penulisan data hanya lewat server (Firebase Admin SDK), klien hanya boleh membaca event
- Admin memakai custom claim, perangkat memakai token, endpoint publik dilindungi CAPTCHA dan batas pemakaian
- Pertanyaan pengunjung tidak disimpan, alamat IP hanya dalam bentuk hash

## Batas layanan gratis
Firestore (Spark), Vercel (Hobby), Supabase (Free), Gemini dan OpenRouter (tier gratis). Semua punya kuota
harian, dan situs menyediakan penjaga kuota untuk event dan asisten AI.

## Status
- Web: berjalan
- Firmware ESP32: [isi status]

## Tim
[Isi nama dan peran]
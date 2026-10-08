import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import { exec } from "node:child_process"; // DIPERBAIKI: Menggunakan exec bukan execFile
import { promisify } from "node:util";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const runCommand = promisify(exec);

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const BUCKET = "Audio";
const VOICE = process.env.TTS_VOICE ?? "id-ID-ArdiNeural";
const PYTHON = process.env.PYTHON_CMD ?? "python";
const semua = process.argv.includes("--semua"); // buat ulang semua audio

const tmp = path.join(os.tmpdir(), "smartgloves-audio");
await mkdir(tmp, { recursive: true });

// 1. Cari kata aktif yang belum punya audio
const snap = await db.collection("signs").where("aktif", "==", true).get();
const daftar = snap.docs.filter((d) => semua || !d.data().audio_url);
console.log(`${daftar.length} kata perlu dibuatkan audio.`);

let berhasil = 0;
for (const d of daftar) {
  const x = d.data();
  const mentah = path.join(tmp, `${d.id}-raw.mp3`);
  const final = path.join(tmp, `${d.id}.mp3`);
  try {
    // 2. Teks -> suara (DIPERBAIKI: Menggunakan string utuh untuk menghindari EFTYPE Windows)
    const ttsCmd = `"${PYTHON}" -m edge_tts --voice ${VOICE} --text "${x.teks_output}" --write-media "${mentah}"`;
    await runCommand(ttsCmd);

    // 3. Kecilkan: mono, 16 kHz, 32 kbps (cocok untuk ESP32)
    //    DIPERBAIKI: Membungkus ffmpegPath dengan tanda kutip ganda karena jalurnya panjang
    const ffmpegCmd = `"${ffmpegPath}" -y -i "${mentah}" -ac 1 -ar 16000 -b:a 32k "${final}"`;
    await runCommand(ffmpegCmd);

    // 4. Unggah ke Supabase
    const buf = await readFile(final);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${d.id}.mp3`, buf, { contentType: "audio/mpeg", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${d.id}.mp3`);

    // 5. Simpan alamatnya (?v= supaya ESP32 tahu kalau filenya berganti)
    await d.ref.update({
      audio_url: `${data.publicUrl}?v=${Date.now()}`,
      diubah: FieldValue.serverTimestamp(),
    });
    console.log(`OK     ${x.teks_output} (${(buf.length / 1024).toFixed(1)} KB)`);
    berhasil++;
  } catch (e) {
    console.log(`GAGAL  ${x.teks_output}: ${e.message}`);
  }
}

// 6. Perbarui ruleset (versi naik) supaya ESP32 tahu ada audio baru.
if (berhasil > 0) {
  const aktif = await db.collection("signs").where("aktif", "==", true).get();
  const statis = aktif.docs.flatMap((d) => {
    const x = d.data();
    if (!Array.isArray(x.kondisi) || x.kondisi.length === 0) return [];
    return [
      {
        sign_id: d.id,
        teks: String(x.teks_output),
        durasi_tahan_ms: Number(x.durasi_tahan_ms ?? 400),
        kondisi: x.kondisi,
        audio_url: x.audio_url ?? null,
      },
    ];
  });
  const ref = db.collection("ruleset").doc("current");
  const lama = await ref.get();
  const versi = (lama.exists ? Number(lama.data().versi ?? 0) : 0) + 1;
  await ref.set({ versi, statis, diubah: FieldValue.serverTimestamp() });
  console.log(`Ruleset diperbarui ke versi ${versi}.`);
}

await rm(tmp, { recursive: true, force: true });
console.log("Selesai.");

import { Mp3Encoder } from "@breezystack/lamejs";

const SAMPLE_RATE = 16000;
export const MAKS_DETIK = 20;

function rapikan(pcm: Float32Array): Float32Array {
  const AMBANG = 0.02;
  const PAD = Math.round(SAMPLE_RATE * 0.05);

  let awal = 0;
  let akhir = pcm.length - 1;
  while (awal < pcm.length && Math.abs(pcm[awal]) < AMBANG) awal++;
  while (akhir > awal && Math.abs(pcm[akhir]) < AMBANG) akhir--;
  if (awal >= akhir) throw new Error("Rekaman terlalu sunyi atau kosong.");

  awal = Math.max(0, awal - PAD);
  akhir = Math.min(pcm.length - 1, akhir + PAD);
  const potong = pcm.slice(awal, akhir + 1);

  let puncak = 0;
  for (let i = 0; i < potong.length; i++) puncak = Math.max(puncak, Math.abs(potong[i]));
  const gain = puncak > 0 ? Math.min(0.95 / puncak, 8) : 1;
  for (let i = 0; i < potong.length; i++) potong[i] *= gain;
  return potong;
}

export async function ubahKeMp3(sumber: Blob): Promise<{ blob: Blob; detik: number }> {
  const data = await sumber.arrayBuffer();

  const ctx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(data);
  } catch {
    throw new Error("File ini tidak bisa dibaca sebagai audio. Coba format MP3, WAV, atau M4A.");
  } finally {
    void ctx.close();
  }
  if (decoded.duration > MAKS_DETIK) {
    throw new Error(`Audio terlalu panjang (maksimal ${MAKS_DETIK} detik).`);
  }

  // Ubah ke mono 16 kHz
  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE)),
    SAMPLE_RATE
  );
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const pcm = rapikan(rendered.getChannelData(0));

  // Float -> Int16
  const int16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Encode MP3: mono, 16 kHz, 32 kbps
  const enc = new Mp3Encoder(1, SAMPLE_RATE, 32);
  const bagian: Uint8Array[] = [];
  for (let i = 0; i < int16.length; i += 1152) {
    const keluar = enc.encodeBuffer(int16.subarray(i, i + 1152));
    if (keluar.length > 0) bagian.push(new Uint8Array(keluar));
  }
  const sisa = enc.flush();
  if (sisa.length > 0) bagian.push(new Uint8Array(sisa));

  const blob = new Blob(bagian as unknown as BlobPart[], { type: "audio/mpeg" });
  return { blob, detik: pcm.length / SAMPLE_RATE };
}
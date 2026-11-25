import { NextResponse } from "next/server";
import { EdgeTTS } from "node-edge-tts";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";
export const maxDuration = 60;

const runCommand = promisify(exec);

const Skema = z.object({
  teks: z.string().trim().min(1).max(120),
  kecepatan: z.string().regex(/^[+-]\d+%$/).optional(), // Contoh: "+35%", "+20%", "+0%", "-10%", "-20%"
});

const salah = (pesan: string, status: number) =>
  NextResponse.json({ error: pesan }, { status });

// Konversi string persentase ("+20%", "-20%", "+0%") menjadi angka pengali atempo FFmpeg (1.20, 0.80, 1.0)
function persentaseKeTempo(kecepatanStr?: string): number {
  if (!kecepatanStr) return 1.0;
  const angka = parseInt(kecepatanStr.replace("%", ""), 10);
  if (Number.isNaN(angka)) return 1.0;
  // Batasi di rentang aman 0.5x sampai 2.0x
  const faktor = 1 + angka / 100;
  return Math.max(0.5, Math.min(2.0, Number(faktor.toFixed(2))));
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return salah("unauthorized", 401);
  const p = Skema.safeParse(await req.json().catch(() => null));
  if (!p.success) return salah("Data tidak valid.", 400);

  const suara = process.env.TTS_VOICE ?? "id-ID-ArdiNeural";
  const tempo = persentaseKeTempo(p.data.kecepatan);

  let teksBersih = p.data.teks
    .trim()
    .replace(/[<>&"']/g, " ")
    .replace(/\s+/g, " ");

  if (!/[.!?]$/.test(teksBersih)) {
    teksBersih += ".";
  }

  const idUnik = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const mp3Temp = path.join(os.tmpdir(), `tts-${idUnik}.mp3`);
  const pcmTemp = path.join(os.tmpdir(), `tts-${idUnik}.pcm`);

  const binName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const realFfmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", binName);

  try {
    // 1. Buat suara standar jernih dari Edge TTS
    const tts = new EdgeTTS({
      voice: suara,
      lang: "id-ID",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    });

    await tts.ttsPromise(teksBersih, mp3Temp);

    // 2. Atur kecepatan secara presisi via FFmpeg (atempo) + pangkas hening awal/akhir
    const filterAudio = `atempo=${tempo},silenceremove=start_periods=1:start_duration=0.05:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-50dB,areverse`;
    const cmd = `"${realFfmpegPath}" -y -i "${mp3Temp}" -af "${filterAudio}" -f s16le -acodec pcm_s16le -ac 1 -ar 24000 "${pcmTemp}"`;
    await runCommand(cmd);

    const pcmBuffer = await fs.readFile(pcmTemp);

    await Promise.all([
      fs.unlink(mp3Temp).catch(() => {}),
      fs.unlink(pcmTemp).catch(() => {}),
    ]);

    if (!pcmBuffer || pcmBuffer.length === 0) {
      return salah("Gagal memproses audio. Coba lagi.", 502);
    }

    return NextResponse.json({
      pcm: pcmBuffer.toString("base64"),
      rate: 24000,
    });
  } catch (e) {
    await Promise.all([
      fs.unlink(mp3Temp).catch(() => {}),
      fs.unlink(pcmTemp).catch(() => {}),
    ]);
    console.error("[TTS Edge]", e instanceof Error ? e.message : e);
    return salah("Pembuatan suara gagal. Coba lagi.", 502);
  }
}

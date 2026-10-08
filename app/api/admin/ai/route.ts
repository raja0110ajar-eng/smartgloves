import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { tanyaJson } from "@/lib/gemini";
import { AiRequestSchema, AiResultSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const INSTRUKSI = `Kamu asisten admin aplikasi penerjemah bahasa isyarat SIBI (Sistem Isyarat Bahasa Indonesia).
Tugasmu: mengubah permintaan admin menjadi daftar kata yang akan didaftarkan.
Balas HANYA JSON dengan bentuk: {"kata":[{"nama_isyarat":"...","teks_output":"..."}]}
- nama_isyarat: nama singkat isyarat, huruf kapital di awal.
- teks_output: teks yang tampil dan diucapkan, ejaan baku Bahasa Indonesia, tanda baca seperlunya agar enak diucapkan.
- Maksimal 20 kata. Jangan menambah kata yang tidak diminta.
- Jangan membuat angka sensor dan jangan menjelaskan apa pun.
- Kalau permintaan tidak berkaitan dengan mendaftarkan kata, balas {"kata":[]}.`;

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = AiRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Perintah terlalu pendek atau terlalu panjang." }, { status: 400 });
  }

  let jawaban: unknown;
  try {
    jawaban = await tanyaJson(INSTRUKSI, parsed.data.perintah);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 429) {
      return NextResponse.json(
        { error: "Kuota AI sedang habis. Coba lagi sebentar, atau tambah kata manual." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "AI gagal menjawab. Periksa API key dan nama model." }, { status: 502 });
  }

  const hasil = AiResultSchema.safeParse(jawaban);
  if (!hasil.success) {
    return NextResponse.json({ error: "Jawaban AI tidak sesuai format. Coba ulangi." }, { status: 502 });
  }

  // Buang kata yang sudah ada atau kembar
  const snap = await adminDb.collection("signs").select("teks_output").limit(500).get();
  const ada = new Set(snap.docs.map((d) => String(d.data().teks_output).toLowerCase()));
  const kata: { nama_isyarat: string; teks_output: string }[] = [];
  const dilewati: string[] = [];
  for (const k of hasil.data.kata) {
    const kunci = k.teks_output.toLowerCase();
    if (ada.has(kunci)) {
      dilewati.push(k.teks_output);
    } else {
      ada.add(kunci);
      kata.push(k);
    }
  }
  return NextResponse.json({ kata, dilewati });
}
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { bangunUlangRuleset } from "@/lib/ruleset";

export const runtime = "nodejs";

const MAKS_BYTE = 500 * 1024;

const salah = (pesan: string, status = 400) =>
  NextResponse.json({ error: pesan }, { status });

// Pemeriksaan sederhana: MP3 diawali tag "ID3" atau penanda frame 0xFF 0xEx
function miripMp3(b: Uint8Array) {
  if (b.length < 4) return false;
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true;
  return b[0] === 0xff && (b[1] & 0xe0) === 0xe0;
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return salah("Data unggahan tidak valid.");
  }
  const id = String(form.get("sign_id") ?? "");
  const file = form.get("file");
  if (!id || !(file instanceof Blob)) return salah("Data tidak lengkap.");
  if (file.size === 0 || file.size > MAKS_BYTE) {
    return salah("Ukuran file tidak sesuai (maksimal 500 KB).");
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  if (!miripMp3(buf)) return salah("File bukan MP3 yang valid.");

  const ref = adminDb.collection("signs").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return salah("Kata tidak ditemukan.", 404);

  const url = process.env.SUPABASE_URL;
  const kunci = process.env.SUPABASE_SECRET_KEY;
  if (!url || !kunci) return salah("Penyimpanan audio belum dikonfigurasi di server.", 500);

  const supabase = createClient(url, kunci);
  const { error } = await supabase.storage
    .from("audio")
    .upload(`${id}.mp3`, buf, { contentType: "audio/mpeg", upsert: true });
  if (error) return salah("Gagal mengunggah ke penyimpanan audio.", 502);

  const { data } = supabase.storage.from("audio").getPublicUrl(`${id}.mp3`);
  await ref.update({
    audio_url: `${data.publicUrl}?v=${Date.now()}`,
    audio_sumber: "unggahan",
    diubah: FieldValue.serverTimestamp(),
  });

  // Audio ada di ruleset yang diunduh ESP32, jadi versinya perlu naik
  const x = doc.data()!;
  if (x.aktif === true && Array.isArray(x.kondisi) && x.kondisi.length > 0) {
    await bangunUlangRuleset();
  }

  return NextResponse.json({ ok: true });
}
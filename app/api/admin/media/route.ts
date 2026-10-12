import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { ID_RE } from "@/lib/detail";

export const runtime = "nodejs";

const MAKS_BYTE = 300 * 1024;
const salah = (pesan: string, status = 400) =>
  NextResponse.json({ error: pesan }, { status });

// WebP diawali "RIFF" dan di byte ke-9 sampai 12 bertuliskan "WEBP"
function miripWebp(b: Uint8Array) {
  if (b.length < 12) return false;
  const teks = (a: number, z: number) => String.fromCharCode(...b.slice(a, z));
  return teks(0, 4) === "RIFF" && teks(8, 12) === "WEBP";
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
  const untuk = String(form.get("untuk") ?? "umum");
  const file = form.get("file");
  if (!(file instanceof Blob)) return salah("File tidak ada.");
  if (file.size === 0 || file.size > MAKS_BYTE) {
    return salah("Ukuran gambar tidak sesuai (maksimal 300 KB).");
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  if (!miripWebp(buf)) return salah("File bukan gambar WebP yang valid.");

  let jalur: string;
  if (untuk === "umum") {
    jalur = `umum/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.webp`;
  } else {
    if (!ID_RE.test(untuk)) return salah("Tujuan tidak valid.");
    if (!(await adminDb.collection("signs").doc(untuk).get()).exists) {
      return salah("Kata tidak ditemukan.", 404);
    }
    jalur = `signs/${untuk}.webp`;
  }

  const url = process.env.SUPABASE_URL;
  const kunci = process.env.SUPABASE_SECRET_KEY;
  if (!url || !kunci) return salah("Penyimpanan belum dikonfigurasi di server.", 500);

  const supabase = createClient(url, kunci);
  const { error } = await supabase.storage
    .from("media")
    .upload(jalur, buf, { contentType: "image/webp", upsert: true });
  if (error) {
    return salah('Gagal mengunggah. Pastikan bucket publik bernama "media" sudah dibuat di Supabase.', 502);
  }
  const { data } = supabase.storage.from("media").getPublicUrl(jalur);
  return NextResponse.json({ ok: true, url: `${data.publicUrl}?v=${Date.now()}` });
}
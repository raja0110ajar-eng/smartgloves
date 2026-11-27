import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { SEMVER } from "@/lib/firmwareAturan";

export const runtime = "nodejs";
export const maxDuration = 60;

const salah = (pesan: string, status = 400) => NextResponse.json({ error: pesan }, { status });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return salah("unauthorized", 401);
  const d = await adminDb.collection("firmware").doc("master").get();
  const x = d.data();
  if (!d.exists || !x) return NextResponse.json({ ada: false });
  return NextResponse.json({
    ada: true,
    aktif: x.aktif === true,
    versi: String(x.versi ?? ""),
    ukuran: Number(x.ukuran ?? 0),
    md5: String(x.md5 ?? ""),
    catatan: String(x.catatan ?? ""),
    diubah: x.diubah?.toMillis?.() ?? 0,
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return salah("unauthorized", 401);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return salah("Data unggahan tidak valid.");
  }
  const versi = String(form.get("versi") ?? "").trim();
  const catatan = String(form.get("catatan") ?? "").slice(0, 200);
  const file = form.get("file");
  if (!SEMVER.test(versi)) return salah("Versi harus berbentuk 1.2.3.");
  if (!(file instanceof Blob)) return salah("File tidak ada.");
  if (file.size < 100_000 || file.size > 1_900_000) {
    return salah("Ukuran file tidak sesuai. Pakai berkas .ino.bin dari Export Compiled Binary (bukan bootloader, partitions, atau merged).");
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] !== 0xe9) return salah("Ini bukan image firmware ESP32.");

  const url = process.env.SUPABASE_URL;
  const kunci = process.env.SUPABASE_SECRET_KEY;
  if (!url || !kunci) return salah("Penyimpanan belum dikonfigurasi di server.", 500);

  const md5 = createHash("md5").update(buf).digest("hex");
  const jalur = `master/${versi}.bin`;
  const supabase = createClient(url, kunci);
  const { error } = await supabase.storage
    .from("firmware")
    .upload(jalur, buf, { contentType: "application/octet-stream", upsert: true });
  if (error) return salah('Gagal mengunggah. Pastikan bucket publik bernama "firmware" sudah dibuat di Supabase.', 502);
  const { data } = supabase.storage.from("firmware").getPublicUrl(jalur);

  await adminDb.collection("firmware").doc("master").set({
    aktif: true,
    versi,
    url: data.publicUrl,
    md5,
    ukuran: buf.length,
    catatan,
    diubah: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true, md5 });
}

// Menonaktifkan firmware di server (perangkat berhenti memperbarui diri)
export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return salah("unauthorized", 401);
  await adminDb.collection("firmware").doc("master").set({ aktif: false }, { merge: true });
  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { dariDoc } from "@/lib/halaman";
import { FORMAT } from "@/lib/cadangan";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [sSnap, hSnap] = await Promise.all([
    adminDb.collection("signs").limit(500).get(),
    adminDb.collection("halaman").limit(100).get(),
  ]);

  const signs = sSnap.docs.map((d) => {
    const x = d.data();
    const o: Record<string, unknown> = {
      id: d.id,
      nama_isyarat: x.nama_isyarat,
      teks_output: x.teks_output,
      kategori: x.kategori ?? "kata",
      aktif: x.aktif === true,
    };
    if (Array.isArray(x.kondisi) && x.kondisi.length > 0) o.kondisi = x.kondisi;
    if (x.durasi_tahan_ms) o.durasi_tahan_ms = x.durasi_tahan_ms;
    if (x.audio_url) o.audio_url = x.audio_url;
    if (x.audio_sumber) o.audio_sumber = x.audio_sumber;
    if (x.arti) o.arti = x.arti;
    if (x.panduan) o.panduan = x.panduan;
    if (x.verifikasi) o.verifikasi = x.verifikasi;
    if (x.gambar_url) {
      o.gambar_url = x.gambar_url;
      o.gambar_alt = x.gambar_alt ?? "";
    }
    if (x.video_id) {
      o.video_id = x.video_id;
      o.video_deskripsi = x.video_deskripsi ?? "";
    }
    return o;
  });

  return NextResponse.json({
    format: FORMAT,
    diekspor: new Date().toISOString(),
    signs,
    halaman: hSnap.docs.map(dariDoc),
  });
}
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { DetailSchema, ID_RE, mediaUrlAman } from "@/lib/detail";

export const runtime = "nodejs";

const tolak = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const salah = (pesan: string, status = 400) =>
  NextResponse.json({ error: pesan }, { status });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!ID_RE.test(id)) return salah("ID tidak valid.");

  const doc = await adminDb.collection("signs").doc(id).get();
  if (!doc.exists) return salah("Kata tidak ditemukan.", 404);
  const x = doc.data()!;
  const v = x.verifikasi && typeof x.verifikasi === "object" ? x.verifikasi : {};

  return NextResponse.json({
    nama_isyarat: String(x.nama_isyarat ?? ""),
    teks_output: String(x.teks_output ?? ""),
    detail: {
      arti: String(x.arti ?? ""),
      panduan: String(x.panduan ?? ""),
      verifikasi: {
        status: v.status === "diverifikasi" ? "diverifikasi" : "belum",
        oleh: String(v.oleh ?? ""),
        tanggal: String(v.tanggal ?? ""),
      },
      gambar_url: String(x.gambar_url ?? ""),
      gambar_alt: String(x.gambar_alt ?? ""),
      video_id: String(x.video_id ?? ""),
      video_deskripsi: String(x.video_deskripsi ?? ""),
    },
  });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!ID_RE.test(id)) return salah("ID tidak valid.");

  const p = DetailSchema.safeParse(body);
  if (!p.success) return salah(p.error.issues[0]?.message ?? "Data tidak valid.");
  const d = p.data;

  const gambar = mediaUrlAman(d.gambar_url);
  if (d.gambar_url && !gambar) return salah("Alamat gambar tidak dikenal.");

  const ref = adminDb.collection("signs").doc(id);
  if (!(await ref.get()).exists) return salah("Kata tidak ditemukan.", 404);

  await ref.update({
    arti: d.arti,
    panduan: d.panduan,
    verifikasi: d.verifikasi,
    gambar_url: gambar,
    gambar_alt: gambar ? d.gambar_alt : "",
    video_id: d.video_id,
    video_deskripsi: d.video_id ? d.video_deskripsi : "",
    diubah: FieldValue.serverTimestamp(),
  });
  revalidatePath("/kamus", "layout");
  return NextResponse.json({ ok: true });
}
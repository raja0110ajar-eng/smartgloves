import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { dariDoc } from "@/lib/halaman";
import { HalamanHapusSchema, HalamanSchema } from "@/lib/schema";

export const runtime = "nodejs";

const tolak = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const salah = (pesan: string, status = 400) =>
  NextResponse.json({ error: pesan }, { status });
const bacaBody = (req: Request) => req.json().catch(() => null);
const segarkan = () => revalidatePath("/", "layout");

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const snap = await adminDb.collection("halaman").limit(100).get();
  const halaman = snap.docs.map(dariDoc).sort((a, b) => a.urutan - b.urutan);
  return NextResponse.json({ halaman });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = HalamanSchema.safeParse(await bacaBody(req));
  if (!parsed.success) {
    return salah(parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }
  const { slug, judul, isi, urutan, tampil } = parsed.data;

  try {
    // create() gagal kalau alamat sudah dipakai, jadi tidak mungkin ada halaman kembar
    await adminDb.collection("halaman").doc(slug).create({
      judul,
      isi,
      urutan,
      tampil,
      dibuat: FieldValue.serverTimestamp(),
      diubah: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    if ((e as { code?: number }).code === 6) {
      return salah("Alamat itu sudah dipakai halaman lain.", 409);
    }
    throw e;
  }
  segarkan();
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = HalamanSchema.safeParse(await bacaBody(req));
  if (!parsed.success) {
    return salah(parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }
  const { slug, judul, isi, urutan, tampil } = parsed.data;

  const ref = adminDb.collection("halaman").doc(slug);
  if (!(await ref.get()).exists) return salah("Halaman tidak ditemukan.", 404);

  await ref.update({
    judul,
    isi,
    urutan,
    tampil,
    diubah: FieldValue.serverTimestamp(),
  });
  segarkan();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = HalamanHapusSchema.safeParse(await bacaBody(req));
  if (!parsed.success) return salah("Data tidak valid.");

  const ref = adminDb.collection("halaman").doc(parsed.data.slug);
  if (!(await ref.get()).exists) return salah("Halaman tidak ditemukan.", 404);
  await ref.delete();
  segarkan();
  return NextResponse.json({ ok: true });
}
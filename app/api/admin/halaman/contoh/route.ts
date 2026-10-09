import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { CONTOH } from "@/lib/halamanContoh";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let dibuat = 0;
  for (const h of CONTOH) {
    try {
      await adminDb.collection("halaman").doc(h.slug).create({
        judul: h.judul,
        isi: h.isi,
        urutan: h.urutan,
        tampil: true,
        dibuat: FieldValue.serverTimestamp(),
        diubah: FieldValue.serverTimestamp(),
      });
      dibuat++;
    } catch (e) {
      if ((e as { code?: number }).code !== 6) throw e;
    }
  }
  if (dibuat > 0) revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, dibuat });
}
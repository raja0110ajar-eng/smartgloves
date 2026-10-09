import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { targetAksi, terapkanAksi, type HasilAksi } from "@/lib/aksi";
import { TerapkanSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = TerapkanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data aksi tidak valid." }, { status: 400 });
  }

  const hasil: HasilAksi[] = [];
  for (const a of parsed.data.aksi) {
    try {
      hasil.push(await terapkanAksi(a));
    } catch {
      hasil.push({ target: targetAksi(a), ok: false, pesan: "Terjadi kesalahan di server." });
    }
  }

  await adminDb.collection("log_aksi").add({
    uid: admin.uid,
    email: admin.email ?? "",
    perintah: (parsed.data.perintah ?? "").slice(0, 500),
    hasil: hasil.map((h, i) => ({
      tipe: parsed.data.aksi[i].tipe,
      target: h.target,
      ok: h.ok,
      pesan: h.pesan,
    })),
    waktu: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ hasil });
}
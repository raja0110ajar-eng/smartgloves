import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { SimulateSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = SimulateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "data tidak valid" }, { status: 400 });
  }
  const doc = await adminDb.collection("signs").doc(parsed.data.sign_id).get();
  if (!doc.exists || doc.data()?.aktif !== true) {
    return NextResponse.json({ error: "kata tidak ditemukan" }, { status: 404 });
  }
  await adminDb.collection("events").add({
    sign_id: doc.id,
    teks: doc.data()?.teks_output,
    device_id: "simulator",
    skor: Math.round(80 + Math.random() * 19),
    waktu: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}
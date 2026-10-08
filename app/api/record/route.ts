import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { cekDevice } from "@/lib/deviceAuth";
import { RecordSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!cekDevice(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = RecordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", detail: parsed.error.issues },
      { status: 400 }
    );
  }
  await adminDb.collection("recordings").doc("latest").set({
    ...parsed.data,
    waktu: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}
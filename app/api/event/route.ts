import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { EventSchema } from "@/lib/schema";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.DEVICE_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", detail: parsed.error.issues },
      { status: 400 }
    );
  }

  const { sign_id, teks, device_id } = parsed.data;

  await adminDb.collection("events").add({
    sign_id,
    teks,
    device_id,
    waktu: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

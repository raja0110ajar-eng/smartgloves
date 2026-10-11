import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { EventSchema } from "@/lib/schema";
import { adminDb } from "@/lib/firebaseAdmin";
import { batasEventHarian, cekDevice } from "@/lib/deviceAuth";
import { hariIni } from "@/lib/tanya";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!cekDevice(req)) {
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

  // Penjaga kuota: berhenti menerima event kalau batas harian tercapai
  const hitung = adminDb.collection("event_batas").doc(hariIni());
  const sekarang = await hitung.get();
  if (Number(sekarang.data()?.n ?? 0) >= batasEventHarian()) {
    return NextResponse.json({ error: "batas event harian tercapai" }, { status: 429 });
  }
  await hitung.set({ n: FieldValue.increment(1) }, { merge: true });

  const { sign_id, teks, device_id, skor } = parsed.data;
  await adminDb.collection("events").add({
    sign_id,
    teks,
    device_id,
    waktu: FieldValue.serverTimestamp(),
    ...(skor !== undefined ? { skor: Math.round(skor) } : {}),
  });

  return NextResponse.json({ ok: true });
}
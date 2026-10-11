import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { cekDevice } from "@/lib/deviceAuth";
import { catatHeartbeat } from "@/lib/status";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!cekDevice(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams;
  const klien = Number(q.get("versi") ?? 0);

  const rssiMentah = q.get("rssi");
  const rssi = rssiMentah === null ? NaN : Number(rssiMentah);
  await catatHeartbeat(q.get("device_id") ?? "", {
    fw: q.get("fw") ?? undefined,
    rssi: Number.isFinite(rssi) ? rssi : undefined,
  });

  const doc = await adminDb.collection("ruleset").doc("current").get();
  if (!doc.exists) return NextResponse.json({ versi: 0, berubah: true, statis: [] });

  const d = doc.data()!;
  if (klien === d.versi) return NextResponse.json({ versi: d.versi, berubah: false });
  return NextResponse.json({ versi: d.versi, berubah: true, statis: d.statis });
}
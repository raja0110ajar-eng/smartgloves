import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { cekDevice } from "@/lib/deviceAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!cekDevice(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const klien = Number(new URL(req.url).searchParams.get("versi") ?? 0);
  const doc = await adminDb.collection("ruleset").doc("current").get();
  if (!doc.exists) return NextResponse.json({ versi: 0, berubah: true, statis: [] });

  const d = doc.data()!;
  if (klien === d.versi) return NextResponse.json({ versi: d.versi, berubah: false });
  return NextResponse.json({ versi: d.versi, berubah: true, statis: d.statis });
}
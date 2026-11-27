import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { cekDevice } from "@/lib/deviceAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cekDevice(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const d = await adminDb.collection("firmware").doc("master").get();
  const x = d.data();
  if (!d.exists || x?.aktif !== true) return NextResponse.json({ ada: false });
  return NextResponse.json({ ada: true, versi: x.versi, url: x.url, md5: x.md5, ukuran: x.ukuran });
}
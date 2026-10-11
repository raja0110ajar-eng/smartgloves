import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let firestore = false;
  try {
    await adminDb.collection("ruleset").doc("current").get();
    firestore = true;
  } catch {
    /* tetap dilaporkan sebagai tidak sehat */
  }
  return NextResponse.json(
    { ok: firestore, firestore, waktu: new Date().toISOString() },
    {
      status: firestore ? 200 : 503,
      headers: { "Cache-Control": "public, s-maxage=30" },
    }
  );
}
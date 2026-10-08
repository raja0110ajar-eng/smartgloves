import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const doc = await adminDb.collection("recordings").doc("latest").get();
  if (!doc.exists) return NextResponse.json({ samples: [] });
  return NextResponse.json({ samples: doc.data()?.samples ?? [] });
}
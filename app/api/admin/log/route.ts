import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const snap = await adminDb
    .collection("log_admin")
    .orderBy("waktu", "desc")
    .limit(50)
    .get();
  const log = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      email: String(x.email ?? ""),
      method: String(x.method ?? ""),
      path: String(x.path ?? ""),
      waktu: x.waktu?.toMillis?.() ?? 0,
    };
  });
  return NextResponse.json({ log });
}
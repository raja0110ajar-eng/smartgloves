import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Cron memanggil alamat ini dengan header Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || req.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hasil: Record<string, string> = {};

  try {
    const url = process.env.SUPABASE_URL;
    const kunci = process.env.SUPABASE_SECRET_KEY;
    if (url && kunci) {
      const { error } = await createClient(url, kunci)
        .storage.from("audio")
        .list("", { limit: 1 });
      hasil.supabase = error ? "gagal" : "ok";
    } else {
      hasil.supabase = "belum dikonfigurasi";
    }
  } catch {
    hasil.supabase = "gagal";
  }

  try {
    await adminDb.collection("ruleset").doc("current").get();
    hasil.firestore = "ok";
  } catch {
    hasil.firestore = "gagal";
  }

  console.log("[CRON jaga]", JSON.stringify(hasil));
  return NextResponse.json({ ok: true, ...hasil });
}
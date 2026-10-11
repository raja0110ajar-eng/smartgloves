import { NextResponse } from "next/server";
import { ambilStatusPublik } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await ambilStatusPublik(), {
      // Satu hasil dipakai bersama oleh semua pengunjung selama beberapa detik, jadi pembacaan database tetap kecil
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ error: "Status tidak tersedia." }, { status: 503 });
  }
}
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { ambilPakai, statusPenyedia, tesPenyedia } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ...statusPenyedia(), pakai: await ambilPakai() });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const p = body?.penyedia;
  if (p !== "gemini" && p !== "openrouter") {
    return NextResponse.json({ error: "Penyedia tidak dikenal." }, { status: 400 });
  }
  return NextResponse.json(await tesPenyedia(p));
}
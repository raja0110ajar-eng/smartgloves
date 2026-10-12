import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { ambilTicker } from "@/lib/ticker";
import { TickerSchema } from "@/lib/tickerAturan";

export const runtime = "nodejs";

const tolak = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  return NextResponse.json(await ambilTicker());
}

export async function PUT(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const p = TickerSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json(
      { error: p.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 }
    );
  }
  await adminDb
    .collection("pengaturan")
    .doc("ticker")
    .set({
      aktif: p.data.aktif,
      pesan: p.data.pesan,
      diubah: FieldValue.serverTimestamp(),
    });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
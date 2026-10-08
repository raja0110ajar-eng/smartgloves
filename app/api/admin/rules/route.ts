import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { RuleSchema } from "@/lib/schema";
import { cariTumpangTindih } from "@/lib/pose";
import { ambilRuleAktif, bangunUlangRuleset } from "@/lib/ruleset";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = RuleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "data tidak valid" }, { status: 400 });
  }
  const { sign_id, durasi_tahan_ms, kondisi } = parsed.data;

  const ref = adminDb.collection("signs").doc(sign_id);
  if (!(await ref.get()).exists) {
    return NextResponse.json({ error: "kata tidak ditemukan" }, { status: 404 });
  }

  const lain = (await ambilRuleAktif()).filter((r) => r.sign_id !== sign_id);
  const bentrok = cariTumpangTindih(kondisi, lain).map((r) => r.teks);

  await ref.update({ kondisi, durasi_tahan_ms, diubah: FieldValue.serverTimestamp() });
  const versi = await bangunUlangRuleset();

  return NextResponse.json({ ok: true, versi, bentrok });
}
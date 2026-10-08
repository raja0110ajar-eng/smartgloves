import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { SignCreateSchema, SignToggleSchema } from "@/lib/schema";
import { bangunUlangRuleset } from "@/lib/ruleset";

export const runtime = "nodejs";

const tolak = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const snap = await adminDb
    .collection("signs")
    .orderBy("dibuat", "desc")
    .limit(200)
    .get();
  const signs = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      nama_isyarat: x.nama_isyarat,
      teks_output: x.teks_output,
      aktif: x.aktif,
    };
  });
  return NextResponse.json({ signs });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = SignCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "data tidak valid" }, { status: 400 });
  }
  const ref = await adminDb.collection("signs").add({
    ...parsed.data,
    aktif: true,
    versi: 1,
    dibuat: FieldValue.serverTimestamp(),
    diubah: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true, id: ref.id });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = SignToggleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    await bangunUlangRuleset();
    return NextResponse.json({ error: "data tidak valid" }, { status: 400 });
  }
  await adminDb.collection("signs").doc(parsed.data.id).update({
    aktif: parsed.data.aktif,
    diubah: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}
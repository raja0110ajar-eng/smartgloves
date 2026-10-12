import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { SesiSchema } from "@/lib/evaluasi";

export const runtime = "nodejs";

const tolak = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const salah = (pesan: string) => NextResponse.json({ error: pesan }, { status: 400 });
const Hapus = z.object({ id: z.string().regex(/^[A-Za-z0-9]{1,40}$/) });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const semua = new URL(req.url).searchParams.get("semua") === "1";
  const snap = await adminDb
    .collection("evaluasi_sesi")
    .orderBy("dibuat", "desc")
    .limit(semua ? 100 : 20)
    .get();

  const sesi = snap.docs.map((d) => {
    const x = d.data();
    const trials: { target?: string; hasil?: string | null }[] = Array.isArray(x.trials)
      ? x.trials
      : [];
    return {
      id: d.id,
      penguji: String(x.penguji ?? ""),
      kondisi: String(x.kondisi ?? ""),
      simulasi: x.simulasi === true,
      versiRuleset: Number(x.versiRuleset ?? 0),
      waktu: x.dibuat?.toMillis?.() ?? 0,
      jumlah: trials.length,
      benar: trials.filter((t) => t.hasil === t.target).length,
      ...(semua ? { trials } : {}),
    };
  });
  return NextResponse.json({ sesi });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const p = SesiSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return salah("Data sesi tidak valid.");

  const rs = await adminDb.collection("ruleset").doc("current").get();
  const ref = await adminDb.collection("evaluasi_sesi").add({
    ...p.data,
    versiRuleset: Number(rs.data()?.versi ?? 0),
    dibuat: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true, id: ref.id });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const p = Hapus.safeParse(await req.json().catch(() => null));
  if (!p.success) return salah("Data tidak valid.");
  await adminDb.collection("evaluasi_sesi").doc(p.data.id).delete();
  return NextResponse.json({ ok: true });
}
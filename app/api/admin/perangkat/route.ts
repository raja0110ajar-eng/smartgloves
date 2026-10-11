import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const tolak = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const salah = (pesan: string) => NextResponse.json({ error: pesan }, { status: 400 });

const Simulasi = z.object({ aksi: z.enum(["hidup", "putus"]) });
const Hapus = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,50}$/) });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const snap = await adminDb
    .collection("perangkat")
    .orderBy("terakhirMs", "desc")
    .limit(20)
    .get();
  const sekarang = Date.now();
  return NextResponse.json({
    perangkat: snap.docs.map((d) => {
      const x = d.data();
      const ms = Number(x.terakhirMs ?? 0);
      return {
        id: d.id,
        detikLalu: ms ? Math.max(0, Math.round((sekarang - ms) / 1000)) : null,
        fw: String(x.fw ?? ""),
        rssi: typeof x.rssi === "number" ? x.rssi : null,
      };
    }),
  });
}

// Simulasi: membuat atau mengubah catatan perangkat bernama "simulator"
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const p = Simulasi.safeParse(await req.json().catch(() => null));
  if (!p.success) return salah("Data tidak valid.");
  await adminDb
    .collection("perangkat")
    .doc("simulator")
    .set(
      {
        terakhirMs: p.data.aksi === "hidup" ? Date.now() : Date.now() - 10 * 60_000,
        fw: "simulasi",
        rssi: -55,
      },
      { merge: true }
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const p = Hapus.safeParse(await req.json().catch(() => null));
  if (!p.success) return salah("Data tidak valid.");
  await adminDb.collection("perangkat").doc(p.data.id).delete();
  return NextResponse.json({ ok: true });
}
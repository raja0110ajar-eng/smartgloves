import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { cekDevice } from "@/lib/deviceAuth";
import { bersihId, koleksiPerintah } from "@/lib/perintahServer";

export const runtime = "nodejs";

const Skema = z.object({
  device_id: z.string().min(1).max(50),
  id: z.string().regex(/^[A-Za-z0-9]{10,40}$/),
  ok: z.boolean(),
  pesan: z.string().max(300).default(""),
});

export async function POST(req: Request) {
  if (!cekDevice(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const p = Skema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const ref = koleksiPerintah(bersihId(p.data.device_id)).doc(p.data.id);
  if (!(await ref.get()).exists) {
    return NextResponse.json({ error: "perintah tidak ditemukan" }, { status: 404 });
  }
  await ref.update({
    status: p.data.ok ? "selesai" : "gagal",
    pesan: p.data.pesan,
    selesai: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const Skema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{10,40}$/),
  aksi: z.enum(["tampil", "sembunyi", "hapus"]),
});

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const snap = await adminDb.collection("kesan").orderBy("dibuat", "desc").limit(100).get();
  return NextResponse.json({
    otomatis: process.env.KESAN_OTOMATIS === "true",
    daftar: snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        nama: String(x.nama ?? ""),
        asal: String(x.asal ?? ""),
        pesan: String(x.pesan ?? ""),
        status: String(x.status ?? "menunggu"),
        tinjau: String(x.tinjau ?? ""),
        dibuat: x.dibuat?.toMillis?.() ?? 0,
      };
    }),
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = Skema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  const ref = adminDb.collection("kesan").doc(p.data.id);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: "Pesan tidak ditemukan." }, { status: 404 });

  if (p.data.aksi === "hapus") {
    await ref.delete();
  } else if (p.data.aksi === "sembunyi") {
    // Tanpa tampilPada, pesan otomatis hilang dari daftar publik
    await ref.update({ status: "disembunyikan", tampilPada: FieldValue.delete() });
  } else if (doc.data()?.status !== "tampil") {
    await ref.update({ status: "tampil", tampilPada: FieldValue.serverTimestamp() });
  }
  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { buatSlug } from "@/lib/slug";
import { bangunUlangRuleset } from "@/lib/ruleset";
import { CleanSchema } from "@/lib/schema";

export const runtime = "nodejs";

// Dalam satu kelompok kembar, yang dipertahankan: punya rule > aktif > punya audio > paling lama dibuat
function skor(d: QueryDocumentSnapshot) {
  const x = d.data();
  return (
    (Array.isArray(x.kondisi) && x.kondisi.length > 0 ? 4 : 0) +
    (x.aktif === true ? 2 : 0) +
    (x.audio_url ? 1 : 0)
  );
}
const waktu = (d: QueryDocumentSnapshot) => d.data().dibuat?.toMillis?.() ?? 0;

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = CleanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const snap = await adminDb.collection("signs").limit(500).get();
  const grup = new Map<string, QueryDocumentSnapshot[]>();
  for (const d of snap.docs) {
    const kunci = buatSlug(String(d.data().teks_output ?? "")) || `__${d.id}`;
    grup.set(kunci, [...(grup.get(kunci) ?? []), d]);
  }

  const hapus: QueryDocumentSnapshot[] = [];
  for (const daftar of grup.values()) {
    if (daftar.length < 2) continue;
    daftar.sort((a, b) => skor(b) - skor(a) || waktu(a) - waktu(b));
    hapus.push(...daftar.slice(1));
  }

  if (!parsed.data.simulasi && hapus.length > 0) {
    const batch = adminDb.batch();
    hapus.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const memengaruhi = hapus.some((d) => {
      const x = d.data();
      return x.aktif === true && Array.isArray(x.kondisi) && x.kondisi.length > 0;
    });
    if (memengaruhi) await bangunUlangRuleset();
  }

  return NextResponse.json({
    jumlah: hapus.length,
    daftar: hapus.map((d) => `${d.data().teks_output} (${d.id})`),
  });
}
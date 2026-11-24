import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { bangunUlangRuleset } from "@/lib/ruleset";
import { normKondisi } from "@/lib/pose";
import { CleanSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const p = CleanSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const snap = await adminDb.collection("signs").limit(500).get();
  let perluBahasa = 0;
  let perluSensor = 0;
  const ops: { ref: DocumentReference; ubah: Record<string, unknown> }[] = [];

  for (const d of snap.docs) {
    const x = d.data();
    const ubah: Record<string, unknown> = {};

    if (x.bahasa !== "SIBI" && x.bahasa !== "BISINDO") {
      ubah.bahasa = "SIBI";
      perluBahasa++;
    }
    if (
      Array.isArray(x.kondisi) &&
      x.kondisi.some(
        (c: { sensor?: unknown }) =>
          typeof c?.sensor === "string" &&
          !c.sensor.startsWith("R_") &&
          !c.sensor.startsWith("L_")
      )
    ) {
      ubah.kondisi = normKondisi(x.kondisi);
      perluSensor++;
    }
    if (Object.keys(ubah).length > 0) ops.push({ ref: d.ref, ubah });
  }

  if (!p.data.simulasi && ops.length > 0) {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = adminDb.batch();
      for (const op of ops.slice(i, i + 400)) {
        batch.update(op.ref, { ...op.ubah, diubah: FieldValue.serverTimestamp() });
      }
      await batch.commit();
    }
    await bangunUlangRuleset();
    revalidatePath("/", "layout");
  }

  return NextResponse.json({
    simulasi: p.data.simulasi,
    total: snap.size,
    perluBahasa,
    perluSensor,
    diubah: ops.length,
  });
}
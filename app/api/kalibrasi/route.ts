import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { cekDevice } from "@/lib/deviceAuth";
import { DataTanganSchema, KalibrasiSchema, MAKS_RIWAYAT, olahTangan } from "@/lib/kalibrasi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KOLEKSI = "kalibrasi";

export async function POST(req: Request) {
  if (!cekDevice(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = KalibrasiSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const waktu = Date.now();
  const ref = adminDb.collection(KOLEKSI).doc(p.data.device_id);
  await adminDb.runTransaction(async (tx) => {
    const lama = (await tx.get(ref)).data() ?? {};
    const riwayatLama = Array.isArray(lama.riwayat) ? lama.riwayat : [];
    const entri = {
      waktu,
      sumber: p.data.sumber,
      kanan: p.data.kanan ? olahTangan(p.data.kanan).ringkas : null,
      kiri: p.data.kiri ? olahTangan(p.data.kiri).ringkas : null,
    };
    tx.set(ref, {
      waktu,
      sumber: p.data.sumber,
      // Tangan yang tidak ikut kali ini mempertahankan data sebelumnya
      kanan: p.data.kanan ? { ...p.data.kanan, waktu } : (lama.kanan ?? null),
      kiri: p.data.kiri ? { ...p.data.kiri, waktu } : (lama.kiri ?? null),
      riwayat: [entri, ...riwayatLama].slice(0, MAKS_RIWAYAT),
    });
  });
  return NextResponse.json({ ok: true });
}

function baca(t: unknown) {
  const d = DataTanganSchema.safeParse(t);
  if (!d.success) return null;
  return { waktu: Number((t as { waktu?: unknown }).waktu ?? 0), ...olahTangan(d.data) };
}

// Publik: hanya angka sensor, tanpa data pribadi
export async function GET() {
  try {
    const snap = await adminDb.collection(KOLEKSI).orderBy("waktu", "desc").limit(1).get();
    if (snap.empty) return NextResponse.json({ ada: false });
    const x = snap.docs[0].data();
    return NextResponse.json(
      {
        ada: true,
        waktu: Number(x.waktu ?? 0),
        sumber: String(x.sumber ?? ""),
        kanan: baca(x.kanan),
        kiri: baca(x.kiri),
        riwayat: Array.isArray(x.riwayat) ? x.riwayat : [],
      },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ error: "Gagal memuat." }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { PerintahSchema, TTL_SESI_MS, validasiParam } from "@/lib/perintah";
import { bersihId, koleksiPerintah } from "@/lib/perintahServer";

export const runtime = "nodejs";

const tolak = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const salah = (pesan: string, status = 400) => NextResponse.json({ error: pesan }, { status });
const bacaBody = (req: Request) => req.json().catch(() => null);

const perluSesi = (id: string) =>
  adminDb
    .collection("perangkat")
    .doc(id)
    .set({ sesiSampai: Date.now() + TTL_SESI_MS }, { merge: true });

// Riwayat perintah dan batas mode cepat
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const id = bersihId(new URL(req.url).searchParams.get("device_id") ?? "");
  if (!id) return salah("device_id tidak valid.");

  const [snap, dev] = await Promise.all([
    koleksiPerintah(id).orderBy("dibuat", "desc").limit(8).get(),
    adminDb.collection("perangkat").doc(id).get(),
  ]);
  const riwayat = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      aksi: String(x.aksi ?? ""),
      param: String(x.param ?? ""),
      status: String(x.status ?? ""),
      pesan: String(x.pesan ?? ""),
      oleh: String(x.oleh ?? ""),
      dibuat: x.dibuat?.toMillis?.() ?? 0,
      diambil: x.diambil?.toMillis?.() ?? 0,
    };
  });
  return NextResponse.json({ riwayat, sesiSampai: Number(dev.data()?.sesiSampai ?? 0) });
}

// Kirim perintah baru
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return tolak();
  const p = PerintahSchema.safeParse(await bacaBody(req));
  if (!p.success) return salah("Data perintah tidak valid.");
  const v = validasiParam(p.data.aksi, p.data.param);
  if (!v.ok) return salah(v.pesan);

  const id = bersihId(p.data.device_id);
  if (!(await adminDb.collection("perangkat").doc(id).get()).exists) {
    return salah("Perangkat itu belum pernah terhubung.", 404);
  }
  const tunggu = await koleksiPerintah(id).where("status", "==", "menunggu").limit(6).get();
  if (tunggu.size >= 5) {
    return salah("Sudah ada 5 perintah yang menunggu. Tunggu sarung tangan mengambilnya.", 429);
  }

  const ref = await koleksiPerintah(id).add({
    aksi: p.data.aksi,
    param: v.param,
    status: "menunggu",
    dibuat: FieldValue.serverTimestamp(),
    oleh: admin.email ?? "",
  });
  await perluSesi(id);
  return NextResponse.json({ ok: true, id: ref.id });
}

// Aktifkan mode cepat 3 menit tanpa mengirim perintah
export async function PUT(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const b = await bacaBody(req);
  const id = bersihId(typeof b?.device_id === "string" ? b.device_id : "");
  if (!id) return salah("device_id tidak valid.");
  if (!(await adminDb.collection("perangkat").doc(id).get()).exists) {
    return salah("Perangkat itu belum pernah terhubung.", 404);
  }
  await perluSesi(id);
  return NextResponse.json({ ok: true });
}

// Batalkan perintah yang masih menunggu
export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const b = await bacaBody(req);
  const dev = bersihId(typeof b?.device_id === "string" ? b.device_id : "");
  const cmd = typeof b?.id === "string" && /^[A-Za-z0-9]{10,40}$/.test(b.id) ? b.id : "";
  if (!dev || !cmd) return salah("Data tidak valid.");
  const ref = koleksiPerintah(dev).doc(cmd);
  const d = await ref.get();
  if (!d.exists) return salah("Perintah tidak ditemukan.", 404);
  if (d.data()?.status !== "menunggu") return salah("Perintah sudah diambil sarung tangan.", 409);
  await ref.delete();
  return NextResponse.json({ ok: true });
}
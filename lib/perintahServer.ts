import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

export const bersihId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 50);

// Perintah disimpan di sub-koleksi tiap perangkat, jadi tidak butuh indeks gabungan
export const koleksiPerintah = (deviceId: string) =>
  adminDb.collection("perangkat").doc(deviceId).collection("perintah");

export async function sesiSampaiMs(deviceId: string): Promise<number> {
  const d = await adminDb.collection("perangkat").doc(deviceId).get();
  return Number(d.data()?.sesiSampai ?? 0);
}

// Mengambil perintah yang menunggu (maksimal 5) dan menandainya "dikirim"
export async function ambilPerintahTertunda(deviceId: string) {
  const snap = await koleksiPerintah(deviceId).where("status", "==", "menunggu").limit(5).get();
  const daftar = snap.docs
    .map((d) => ({
      id: d.id,
      aksi: String(d.data().aksi ?? ""),
      param: String(d.data().param ?? ""),
      dibuat: d.data().dibuat?.toMillis?.() ?? 0,
    }))
    .sort((a, b) => a.dibuat - b.dibuat);
  if (daftar.length > 0) {
    const batch = adminDb.batch();
    for (const p of daftar) {
      batch.update(koleksiPerintah(deviceId).doc(p.id), {
        status: "dikirim",
        diambil: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return daftar.map(({ id, aksi, param }) => ({ id, aksi, param }));
}
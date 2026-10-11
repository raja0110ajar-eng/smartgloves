import { adminDb } from "./firebaseAdmin";
import { batasEventHarian } from "./deviceAuth";
import { hariIni } from "./tanya";
import { kondisiPerangkat } from "./statusBantu";

const JEDA_TULIS_MS = 100_000; // dicatat paling sering sekali per ~100 detik per perangkat

// Dipanggil saat perangkat memeriksa ruleset. Kegagalan di sini tidak boleh menggagalkan permintaan.
export async function catatHeartbeat(
  deviceId: string,
  info: { fw?: string; rssi?: number } = {}
) {
  const id = deviceId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 50);
  if (!id) return;
  try {
    const ref = adminDb.collection("perangkat").doc(id);
    const d = await ref.get();
    if (Date.now() - Number(d.data()?.terakhirMs ?? 0) < JEDA_TULIS_MS) return;
    await ref.set(
      {
        terakhirMs: Date.now(),
        ...(info.fw ? { fw: info.fw.slice(0, 20) } : {}),
        ...(typeof info.rssi === "number" ? { rssi: Math.round(info.rssi) } : {}),
      },
      { merge: true }
    );
  } catch {
    /* abaikan */
  }
}

// Status ringkas untuk halaman publik. Tidak memuat data sensitif.
export async function ambilStatusPublik() {
  const [pSnap, bDoc] = await Promise.all([
    adminDb.collection("perangkat").orderBy("terakhirMs", "desc").limit(1).get(),
    adminDb.collection("event_batas").doc(hariIni()).get(),
  ]);
  const terakhirMs = Number(pSnap.docs[0]?.data().terakhirMs ?? 0);
  const detikLalu = terakhirMs ? Math.max(0, Math.round((Date.now() - terakhirMs) / 1000)) : null;
  return {
    kondisi: kondisiPerangkat(detikLalu),
    detikLalu,
    batasTercapai: Number(bDoc.data()?.n ?? 0) >= batasEventHarian(),
  };
}
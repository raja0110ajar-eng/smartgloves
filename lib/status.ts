import { adminDb } from "./firebaseAdmin";
import { batasEventHarian } from "./deviceAuth";
import { hariIni } from "./tanya";
import { kondisiPerangkat } from "./statusBantu";
import { normBahasa, type Bahasa } from "./bahasa";

const JEDA_TULIS_MS = 100_000; // dicatat paling sering sekali per ~100 detik per perangkat

export type InfoHeartbeat = {
  fw?: string;
  rssi?: number;
  kiri?: boolean; // tangan kiri (slave) terhubung ke master
  vk?: number; // tegangan baterai kanan (mV)
  vi?: number; // tegangan baterai kiri (mV)
  bhs?: Bahasa; // bahasa aktif di sarung tangan
};

// Dipanggil saat perangkat memeriksa ruleset. Kegagalan di sini tidak boleh menggagalkan permintaan.
export async function catatHeartbeat(deviceId: string, info: InfoHeartbeat = {}) {
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
        ...(typeof info.kiri === "boolean" ? { kiri: info.kiri } : {}),
        ...(typeof info.vk === "number" ? { vk: Math.round(info.vk) } : {}),
        ...(typeof info.vi === "number" ? { vi: Math.round(info.vi) } : {}),
        ...(info.bhs ? { bhs: info.bhs } : {}),
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
  const d = pSnap.docs[0]?.data();
  const terakhirMs = Number(d?.terakhirMs ?? 0);
  const detikLalu = terakhirMs ? Math.max(0, Math.round((Date.now() - terakhirMs) / 1000)) : null;
  return {
    kondisi: kondisiPerangkat(detikLalu),
    detikLalu,
    batasTercapai: Number(bDoc.data()?.n ?? 0) >= batasEventHarian(),
    kiri: typeof d?.kiri === "boolean" ? d.kiri : null,
    bahasa: d?.bhs ? normBahasa(d.bhs) : null,
  };
}
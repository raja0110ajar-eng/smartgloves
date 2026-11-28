import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { cekDevice } from "@/lib/deviceAuth";
import { catatHeartbeat } from "@/lib/status";
import { ambilPerintahTertunda, bersihId, sesiSampaiMs } from "@/lib/perintahServer";
import { POLL_NORMAL_MS, pollMsUntuk } from "@/lib/perintah";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!cekDevice(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams;
  const klien = Number(q.get("versi") ?? 0);

  const angka = (kunci: string) => {
    const v = q.get(kunci);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const kiriMentah = q.get("kiri");
  const bhsMentah = q.get("bhs");
  const deviceId = bersihId(q.get("device_id") ?? "");

  await catatHeartbeat(deviceId, {
    fw: q.get("fw") ?? undefined,
    rssi: angka("rssi"),
    kiri: kiriMentah === null ? undefined : kiriMentah === "1",
    vk: angka("vk"),
    vi: angka("vi"),
    bhs: bhsMentah === "SIBI" || bhsMentah === "BISINDO" ? bhsMentah : undefined,
  });

  // Perintah dari web dan jeda pemeriksaan. Kegagalan di sini tidak boleh menggagalkan ruleset.
  let perintah: { id: string; aksi: string; param: string }[] = [];
  let pollMs = POLL_NORMAL_MS;
  if (deviceId) {
    try {
      perintah = await ambilPerintahTertunda(deviceId);
      pollMs = pollMsUntuk(perintah.length > 0, await sesiSampaiMs(deviceId), Date.now());
    } catch {
      /* abaikan */
    }
  }

  const doc = await adminDb.collection("ruleset").doc("current").get();
  if (!doc.exists) {
    return NextResponse.json({ versi: 0, berubah: true, statis: [], poll_ms: pollMs, perintah });
  }

  const d = doc.data()!;
  if (klien === d.versi) {
    return NextResponse.json({ versi: d.versi, berubah: false, poll_ms: pollMs, perintah });
  }
  return NextResponse.json({ versi: d.versi, berubah: true, statis: d.statis, poll_ms: pollMs, perintah });
}
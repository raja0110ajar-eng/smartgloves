import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import type { Kondisi, StaticRule } from "./pose";

export async function ambilRuleAktif(): Promise<StaticRule[]> {
  const snap = await adminDb.collection("signs").where("aktif", "==", true).get();
  return snap.docs.flatMap((d) => {
    const x = d.data();
    if (!Array.isArray(x.kondisi) || x.kondisi.length === 0) return [];
    return [
      {
        sign_id: d.id,
        teks: String(x.teks_output),
        durasi_tahan_ms: Number(x.durasi_tahan_ms ?? 400),
        kondisi: x.kondisi as Kondisi[],
        audio_url: (x.audio_url as string | undefined) ?? null,
      },
    ];
  });
}

export async function bangunUlangRuleset() {
  const statis = await ambilRuleAktif();
  const ref = adminDb.collection("ruleset").doc("current");
  const lama = await ref.get();
  const versi = (lama.exists ? Number(lama.data()?.versi ?? 0) : 0) + 1;
  await ref.set({ versi, statis, diubah: FieldValue.serverTimestamp() });
  return versi;
}
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { cariTumpangTindih, type Kondisi, type StaticRule } from "@/lib/pose";
import { ambilPakai } from "@/lib/ai";
import { hariIni } from "@/lib/tanya";
import { batasEventHarian } from "@/lib/deviceAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hari = hariIni();
  const [sSnap, hSnap, rDoc, eDoc, tDoc, pakai] = await Promise.all([
    adminDb.collection("signs").limit(500).get(),
    adminDb.collection("halaman").limit(100).get(),
    adminDb.collection("ruleset").doc("current").get(),
    adminDb.collection("event_batas").doc(hari).get(),
    adminDb.collection("tanya_batas").doc(`global_${hari}`).get(),
    ambilPakai(),
  ]);

  let aktif = 0;
  let nonaktif = 0;
  let punyaRule = 0;
  let punyaAudio = 0;
  const perKategori: Record<string, number> = {};
  const tanpaRule: string[] = [];
  const tanpaAudio: string[] = [];
  const rules: StaticRule[] = [];

  for (const d of sSnap.docs) {
    const x = d.data();
    if (x.aktif !== true) {
      nonaktif++;
      continue;
    }
    aktif++;
    const teks = String(x.teks_output ?? "");
    const kat = String(x.kategori ?? "kata");
    perKategori[kat] = (perKategori[kat] ?? 0) + 1;

    if (Array.isArray(x.kondisi) && x.kondisi.length > 0) {
      punyaRule++;
      rules.push({
        sign_id: d.id,
        teks,
        durasi_tahan_ms: Number(x.durasi_tahan_ms ?? 400),
        kondisi: x.kondisi as Kondisi[],
      });
    } else {
      tanpaRule.push(teks);
    }
    if (x.audio_url) punyaAudio++;
    else tanpaAudio.push(teks);
  }

  // Pasangan rule yang bisa cocok bersamaan (rentang sensornya saling beririsan)
  const bentrok: string[] = [];
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i];
      const b = rules[j];
      if (
        cariTumpangTindih(a.kondisi, [b]).length > 0 &&
        cariTumpangTindih(b.kondisi, [a]).length > 0
      ) {
        bentrok.push(`${a.teks} dan ${b.teks}`);
      }
    }
  }

  const halamanTampil = hSnap.docs.filter((d) => d.data().tampil === true).length;
  const batasTanya = Number(process.env.TANYA_BATAS_HARIAN);

  return NextResponse.json({
    kata: {
      aktif,
      nonaktif,
      punyaRule,
      punyaAudio,
      perKategori,
      tanpaRule: tanpaRule.slice(0, 10),
      tanpaAudio: tanpaAudio.slice(0, 10),
    },
    halaman: { tampil: halamanTampil, tersembunyi: hSnap.size - halamanTampil },
    ruleset: {
      versi: Number(rDoc.data()?.versi ?? 0),
      diubah: rDoc.data()?.diubah?.toMillis?.() ?? 0,
      jumlah: Array.isArray(rDoc.data()?.statis) ? rDoc.data()!.statis.length : 0,
    },
    event: { hariIni: Number(eDoc.data()?.n ?? 0), batas: batasEventHarian() },
    ai: pakai,
    tanya: {
      hariIni: Number(tDoc.data()?.n ?? 0),
      batas: Number.isFinite(batasTanya) && batasTanya > 0 ? batasTanya : 150,
    },
    bentrok: bentrok.slice(0, 20),
    env: {
      device_token: !!process.env.DEVICE_TOKEN,
      supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY && !!process.env.OPENROUTER_MODEL,
      turnstile:
        !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      tanya_aktif: process.env.TANYA_AKTIF !== "false",
    },
  });
}
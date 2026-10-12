import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { bangunUlangRuleset } from "@/lib/ruleset";
import { buatSlug } from "@/lib/slug";
import { HalamanSchema } from "@/lib/schema";
import { mediaUrlAman } from "@/lib/detail";
import {
  ImporSchema,
  SignBackup,
  audioUrlAman,
  type SignBackupTipe,
} from "@/lib/cadangan";

export const runtime = "nodejs";
export const maxDuration = 60;

type Op = { ref: DocumentReference; data: Record<string, unknown> };

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = ImporSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Berkas cadangan tidak valid atau formatnya tidak dikenali." },
      { status: 400 }
    );
  }
  const { berkas, mode, simulasi } = parsed.data;

  // 1. Periksa tiap entri
  const signs: SignBackupTipe[] = [];
  const halaman: ReturnType<typeof HalamanSchema.parse>[] = [];
  const galat: string[] = [];
  berkas.signs.forEach((raw, i) => {
    const p = SignBackup.safeParse(raw);
    if (p.success) signs.push(p.data);
    else galat.push(`Kata #${i + 1}: ${p.error.issues[0]?.message ?? "tidak valid"}`);
  });
  berkas.halaman.forEach((raw, i) => {
    const p = HalamanSchema.safeParse(raw);
    if (p.success) halaman.push(p.data);
    else galat.push(`Halaman #${i + 1}: ${p.error.issues[0]?.message ?? "tidak valid"}`);
  });

  // 2. Bandingkan dengan data yang sudah ada
  const [sSnap, hSnap] = await Promise.all([
    adminDb.collection("signs").select("teks_output").limit(500).get(),
    adminDb.collection("halaman").select("judul").limit(100).get(),
  ]);
  const idAda = new Set(sSnap.docs.map((d) => d.id));
  const pemilikTeks = new Map<string, string>();
  for (const d of sSnap.docs) {
    pemilikTeks.set(buatSlug(String(d.data().teks_output ?? "")), d.id);
  }
  const halAda = new Set(hSnap.docs.map((d) => d.id));

  // 3. Susun rencana
  const ops: Op[] = [];
  const ringkas = {
    sign: { baru: 0, timpa: 0, lewati: 0, kembar: 0 },
    halaman: { baru: 0, timpa: 0, lewati: 0 },
  };
  const slugDalamBerkas = new Set<string>();

  for (const s of signs) {
    const slug = buatSlug(s.teks_output);
    const pemilik = pemilikTeks.get(slug);
    if (!slug || slugDalamBerkas.has(slug) || (pemilik && pemilik !== s.id)) {
      ringkas.sign.kembar++;
      continue;
    }
    slugDalamBerkas.add(slug);

    const ada = idAda.has(s.id);
    if (ada && mode === "lewati") {
      ringkas.sign.lewati++;
      continue;
    }

    const data: Record<string, unknown> = {
      nama_isyarat: s.nama_isyarat,
      teks_output: s.teks_output,
      kategori: s.kategori ?? "kata",
      aktif: s.aktif,
      diubah: FieldValue.serverTimestamp(),
    };
    if (s.kondisi) {
      data.kondisi = s.kondisi;
      data.durasi_tahan_ms = s.durasi_tahan_ms ?? 400;
    }
    const audio = audioUrlAman(s.audio_url);
    if (audio) {
      data.audio_url = audio;
      if (s.audio_sumber) data.audio_sumber = s.audio_sumber;
    }
    if (s.arti !== undefined) data.arti = s.arti;
    if (s.panduan !== undefined) data.panduan = s.panduan;
    if (s.verifikasi) data.verifikasi = s.verifikasi;
    const gambar = mediaUrlAman(s.gambar_url);
    if (gambar && s.gambar_alt) {
      data.gambar_url = gambar;
      data.gambar_alt = s.gambar_alt;
    }
    if (s.video_id && s.video_deskripsi) {
      data.video_id = s.video_id;
      data.video_deskripsi = s.video_deskripsi;
    }
    if (!ada) {
      data.dibuat = FieldValue.serverTimestamp();
      data.versi = 1;
    }
    ops.push({ ref: adminDb.collection("signs").doc(s.id), data });
    ringkas.sign[ada ? "timpa" : "baru"]++;
  }

  for (const h of halaman) {
    const ada = halAda.has(h.slug);
    if (ada && mode === "lewati") {
      ringkas.halaman.lewati++;
      continue;
    }
    ops.push({
      ref: adminDb.collection("halaman").doc(h.slug),
      data: {
        judul: h.judul,
        isi: h.isi,
        urutan: h.urutan,
        tampil: h.tampil,
        diubah: FieldValue.serverTimestamp(),
        ...(ada ? {} : { dibuat: FieldValue.serverTimestamp() }),
      },
    });
    ringkas.halaman[ada ? "timpa" : "baru"]++;
  }

  // 4. Terapkan (kecuali hanya pemeriksaan)
  if (!simulasi && ops.length > 0) {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = adminDb.batch();
      for (const op of ops.slice(i, i + 400)) batch.set(op.ref, op.data, { merge: true });
      await batch.commit();
    }
    await bangunUlangRuleset();
    revalidatePath("/", "layout");
  }

  return NextResponse.json({
    simulasi,
    ringkas,
    galat: galat.slice(0, 10),
    jumlahGalat: galat.length,
  });
}
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { buatSlug } from "@/lib/slug";
import { bangunUlangRuleset } from "@/lib/ruleset";
import { idKata, normBahasa, type Bahasa } from "@/lib/bahasa";
import { jenisTangan, normKondisi } from "@/lib/pose";
import {
  SignCreateSchema,
  SignDeleteSchema,
  SignToggleSchema,
  SignUpdateSchema,
} from "@/lib/schema";

export const runtime = "nodejs";

const tolak = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const salah = (pesan: string, status = 400) =>
  NextResponse.json({ error: pesan }, { status });
const bacaBody = (req: Request) => req.json().catch(() => null);

// Cari kata lain dengan teks sama DI BAHASA YANG SAMA (huruf besar/kecil dan tanda baca diabaikan)
async function cariKembar(bahasa: Bahasa, slug: string, kecualiId?: string) {
  const snap = await adminDb
    .collection("signs")
    .select("teks_output", "bahasa")
    .limit(500)
    .get();
  return snap.docs.find(
    (d) =>
      d.id !== kecualiId &&
      normBahasa(d.data().bahasa) === bahasa &&
      buatSlug(String(d.data().teks_output ?? "")) === slug
  );
}

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const snap = await adminDb
    .collection("signs")
    .orderBy("dibuat", "desc")
    .limit(500)
    .get();
  const signs = snap.docs.map((d) => {
    const x = d.data();
    const kondisi = normKondisi(x.kondisi);
    return {
      id: d.id,
      nama_isyarat: x.nama_isyarat,
      teks_output: x.teks_output,
      kategori: x.kategori ?? "kata",
      bahasa: normBahasa(x.bahasa),
      tangan: jenisTangan(kondisi),
      aktif: x.aktif === true,
      audio_url: x.audio_url ?? "",
      punya_rule: kondisi.length > 0,
      kondisi,
      durasi_tahan_ms: Number(x.durasi_tahan_ms ?? 400),
    };
  });
  return NextResponse.json({ signs });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = SignCreateSchema.safeParse(await bacaBody(req));
  if (!parsed.success) return salah("Data tidak valid.");

  const bahasa: Bahasa = parsed.data.bahasa ?? "SIBI";
  const slug = buatSlug(parsed.data.teks_output);
  if (!slug) return salah("Teks harus berisi huruf atau angka.");

  const pesanKembar = `Kata "${parsed.data.teks_output}" sudah ada di ${bahasa}.`;
  if (await cariKembar(bahasa, slug)) return salah(pesanKembar, 409);

  const id = idKata(bahasa, slug);
  try {
    // create() gagal kalau ID sudah ada, jadi aman walau dua permintaan datang bersamaan
    await adminDb.collection("signs").doc(id).create({
      nama_isyarat: parsed.data.nama_isyarat,
      teks_output: parsed.data.teks_output,
      kategori: parsed.data.kategori ?? "kata",
      bahasa,
      aktif: true,
      versi: 1,
      dibuat: FieldValue.serverTimestamp(),
      diubah: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    if ((e as { code?: number }).code === 6) return salah(pesanKembar, 409);
    throw e;
  }
  return NextResponse.json({ ok: true, id });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = SignUpdateSchema.safeParse(await bacaBody(req));
  if (!parsed.success) return salah("Data tidak valid.");
  const { id, nama_isyarat, teks_output, kategori } = parsed.data;

  const ref = adminDb.collection("signs").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return salah("Kata tidak ditemukan.", 404);

  const lama = doc.data()!;
  const bahasaLama = normBahasa(lama.bahasa);
  const bahasa: Bahasa = parsed.data.bahasa ?? bahasaLama;

  const slug = buatSlug(teks_output);
  if (!slug) return salah("Teks harus berisi huruf atau angka.");
  if (await cariKembar(bahasa, slug, id)) {
    return salah(`Kata "${teks_output}" sudah ada di ${bahasa}.`, 409);
  }

  const teksBerubah = lama.teks_output !== teks_output;
  const bahasaBerubah = bahasa !== bahasaLama;
  await ref.update({
    nama_isyarat,
    teks_output,
    bahasa,
    ...(kategori ? { kategori } : {}),
    // teks berubah = audio lama tidak cocok lagi, hapus supaya dibuat ulang
    ...(teksBerubah ? { audio_url: FieldValue.delete() } : {}),
    diubah: FieldValue.serverTimestamp(),
  });

  const punyaRule = normKondisi(lama.kondisi).length > 0;
  if ((teksBerubah || bahasaBerubah) && lama.aktif === true && punyaRule) {
    await bangunUlangRuleset();
  }

  return NextResponse.json({ ok: true, perlu_audio: teksBerubah });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = SignToggleSchema.safeParse(await bacaBody(req));
  if (!parsed.success) return salah("Data tidak valid.");
  await adminDb.collection("signs").doc(parsed.data.id).update({
    aktif: parsed.data.aktif,
    diubah: FieldValue.serverTimestamp(),
  });
  await bangunUlangRuleset();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return tolak();
  const parsed = SignDeleteSchema.safeParse(await bacaBody(req));
  if (!parsed.success) return salah("Data tidak valid.");

  const ref = adminDb.collection("signs").doc(parsed.data.id);
  const doc = await ref.get();
  if (!doc.exists) return salah("Kata tidak ditemukan.", 404);
  if (doc.data()?.aktif === true) {
    return salah("Nonaktifkan kata ini dulu sebelum menghapus permanen.");
  }
  await ref.delete();
  return NextResponse.json({ ok: true });
}
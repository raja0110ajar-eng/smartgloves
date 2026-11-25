import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { adminDb } from "./firebaseAdmin";
import { bangunUlangRuleset } from "./ruleset";
import { buatSlug } from "./slug";
import { idKata, normBahasa, type Bahasa } from "./bahasa";
import { normKondisi } from "./pose";
import type { Aksi } from "./schema";

export type HasilAksi = { target: string; ok: boolean; pesan: string };

const gagal = (target: string, pesan: string): HasilAksi => ({ target, ok: false, pesan });
const sukses = (target: string, pesan: string): HasilAksi => ({ target, ok: true, pesan });

export function targetAksi(a: Aksi): string {
  switch (a.tipe) {
    case "kata_tambah":
      return a.teks_output;
    case "kata_ubah":
    case "kata_aktif":
    case "kata_hapus":
      return a.id;
    default:
      return a.slug;
  }
}

// Teks yang sama boleh ada di SIBI dan BISINDO, tapi tidak dua kali dalam satu bahasa
async function cariKembar(bahasa: Bahasa, slug: string, kecualiId?: string) {
  const snap = await adminDb.collection("signs").select("teks_output", "bahasa").limit(500).get();
  return snap.docs.find(
    (d) =>
      d.id !== kecualiId &&
      normBahasa(d.data().bahasa) === bahasa &&
      buatSlug(String(d.data().teks_output ?? "")) === slug
  );
}

export async function terapkanAksi(a: Aksi): Promise<HasilAksi> {
  const target = targetAksi(a);
  const signs = adminDb.collection("signs");
  const halaman = adminDb.collection("halaman");

  switch (a.tipe) {
    case "kata_tambah": {
      const bahasa: Bahasa = a.bahasa ?? "SIBI";
      const slug = buatSlug(a.teks_output);
      if (!slug) return gagal(target, "Teks harus berisi huruf atau angka.");
      if (await cariKembar(bahasa, slug)) return gagal(target, `Kata sudah ada di ${bahasa}.`);
      const id = idKata(bahasa, slug);
      try {
        await signs.doc(id).create({
          nama_isyarat: a.nama_isyarat,
          teks_output: a.teks_output,
          kategori: a.kategori ?? "kata",
          bahasa,
          aktif: true,
          versi: 1,
          dibuat: FieldValue.serverTimestamp(),
          diubah: FieldValue.serverTimestamp(),
        });
      } catch (e) {
        if ((e as { code?: number }).code === 6) return gagal(target, `Kata sudah ada di ${bahasa}.`);
        throw e;
      }
      return sukses(target, `Kata ditambahkan ke ${bahasa}.`);
    }

    case "kata_ubah": {
      const ref = signs.doc(a.id);
      const doc = await ref.get();
      if (!doc.exists) return gagal(target, "Kata tidak ditemukan.");
      const lama = doc.data()!;
      const bahasa = normBahasa(lama.bahasa);
      const slug = buatSlug(a.teks_output);
      if (!slug) return gagal(target, "Teks harus berisi huruf atau angka.");
      if (await cariKembar(bahasa, slug, a.id)) {
        return gagal(target, `Teks itu sudah dipakai kata lain di ${bahasa}.`);
      }
      const teksBerubah = lama.teks_output !== a.teks_output;
      await ref.update({
        nama_isyarat: a.nama_isyarat,
        teks_output: a.teks_output,
        ...(teksBerubah ? { audio_url: FieldValue.delete() } : {}),
        diubah: FieldValue.serverTimestamp(),
      });
      if (teksBerubah && lama.aktif === true && normKondisi(lama.kondisi).length > 0) {
        await bangunUlangRuleset();
      }
      return sukses(
        target,
        teksBerubah ? "Kata diubah. Buat suara barunya di halaman Isyarat atau Audio." : "Kata diubah."
      );
    }

    case "kata_aktif": {
      const ref = signs.doc(a.id);
      if (!(await ref.get()).exists) return gagal(target, "Kata tidak ditemukan.");
      await ref.update({ aktif: a.aktif, diubah: FieldValue.serverTimestamp() });
      await bangunUlangRuleset();
      return sukses(target, a.aktif ? "Kata diaktifkan." : "Kata dinonaktifkan.");
    }

    case "kata_hapus": {
      const ref = signs.doc(a.id);
      const doc = await ref.get();
      if (!doc.exists) return gagal(target, "Kata tidak ditemukan.");
      if (doc.data()?.aktif === true) {
        return gagal(target, "Kata masih aktif. Nonaktifkan dulu sebelum menghapus.");
      }
      await ref.delete();
      return sukses(target, "Kata dihapus permanen.");
    }

    case "halaman_tulis": {
      const ref = halaman.doc(a.slug);
      const doc = await ref.get();
      if (doc.exists) {
        const lama = doc.data()!;
        await ref.update({
          judul: a.judul,
          isi: a.isi,
          urutan: a.urutan ?? Number(lama.urutan ?? 0),
          tampil: a.tampil ?? lama.tampil === true,
          diubah: FieldValue.serverTimestamp(),
        });
        revalidatePath("/", "layout");
        return sukses(target, "Halaman diperbarui.");
      }
      await ref.create({
        judul: a.judul,
        isi: a.isi,
        urutan: a.urutan ?? 50,
        tampil: a.tampil ?? false,
        dibuat: FieldValue.serverTimestamp(),
        diubah: FieldValue.serverTimestamp(),
      });
      revalidatePath("/", "layout");
      return sukses(
        target,
        a.tampil
          ? "Halaman dibuat."
          : "Halaman dibuat dalam keadaan disembunyikan. Aktifkan di menu Halaman kalau sudah siap."
      );
    }

    case "halaman_tampil": {
      const ref = halaman.doc(a.slug);
      if (!(await ref.get()).exists) return gagal(target, "Halaman tidak ditemukan.");
      await ref.update({ tampil: a.tampil, diubah: FieldValue.serverTimestamp() });
      revalidatePath("/", "layout");
      return sukses(target, a.tampil ? "Halaman ditampilkan." : "Halaman disembunyikan.");
    }

    case "halaman_hapus": {
      const ref = halaman.doc(a.slug);
      if (!(await ref.get()).exists) return gagal(target, "Halaman tidak ditemukan.");
      await ref.delete();
      revalidatePath("/", "layout");
      return sukses(target, "Halaman dihapus permanen.");
    }
  }
}
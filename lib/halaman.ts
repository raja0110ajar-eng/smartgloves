import type { DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

export type Halaman = {
  slug: string;
  judul: string;
  isi: string;
  urutan: number;
  tampil: boolean;
};

const SLUG_VALID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function dariDoc(d: DocumentSnapshot): Halaman {
  const x = d.data() ?? {};
  return {
    slug: d.id,
    judul: String(x.judul ?? ""),
    isi: String(x.isi ?? ""),
    urutan: Number(x.urutan ?? 0),
    tampil: x.tampil === true,
  };
}

// Dipakai halaman publik: hanya halaman yang "tampil"
export async function ambilHalaman(slug: string): Promise<Halaman | null> {
  if (!SLUG_VALID.test(slug)) return null;
  try {
    const d = await adminDb.collection("halaman").doc(slug).get();
    if (!d.exists || d.data()?.tampil !== true) return null;
    return dariDoc(d);
  } catch {
    return null;
  }
}

// Dipakai navigasi: daftar halaman yang tampil, urut sesuai "urutan"
export async function ambilMenu(): Promise<{ href: string; label: string }[]> {
  try {
    const snap = await adminDb.collection("halaman").where("tampil", "==", true).get();
    return snap.docs
      .map(dariDoc)
      .sort((a, b) => a.urutan - b.urutan)
      .map((h) => ({ href: `/${h.slug}`, label: h.judul }));
  } catch {
    return [];
  }
}
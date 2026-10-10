import { adminDb } from "@/lib/firebaseAdmin";
import { KATEGORI, type Kategori } from "@/lib/kategori";
import type { Kata } from "@/lib/latihan";
import LatihanKlien from "@/components/LatihanKlien";

export const revalidate = 300;
export const metadata = { title: "Latihan isyarat, SmartGloves" };

// SEMENTARA false: selama belum ada sarung tangan, semua kata aktif bisa dilatih
// lewat panel uji. Ubah ke true kalau perangkat sudah dipakai, supaya hanya
// isyarat yang benar-benar punya rule yang muncul.
const HANYA_YANG_PUNYA_RULE = false;

async function ambilKata(): Promise<Kata[]> {
  try {
    const snap = await adminDb.collection("signs").where("aktif", "==", true).get();
    return snap.docs
      .map((d) => {
        const x = d.data();
        const kat = String(x.kategori ?? "kata");
        return {
          id: d.id,
          nama: String(x.nama_isyarat ?? ""),
          teks: String(x.teks_output ?? ""),
          kategori: (KATEGORI as readonly string[]).includes(kat) ? (kat as Kategori) : "kata",
          siap: Array.isArray(x.kondisi) && x.kondisi.length > 0,
        };
      })
      .filter((k) => !HANYA_YANG_PUNYA_RULE || k.siap)
      .map(({ siap: _siap, ...k }) => k);
  } catch {
    return [];
  }
}

export default async function LatihanPage() {
  const kata = await ambilKata();

  return (
    <main className="kontainer bagian">
      <h1>Latihan isyarat</h1>
      <LatihanKlien kata={kata} />
    </main>
  );
}
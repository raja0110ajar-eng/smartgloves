import { adminDb } from "@/lib/firebaseAdmin";
import { KATEGORI, type Kategori } from "@/lib/kategori";
import { normBahasa } from "@/lib/bahasa";
import { jenisTangan, normKondisi } from "@/lib/pose";
import type { Kata } from "@/lib/latihan";
import LatihanBahasa from "@/components/LatihanBahasa";

export const revalidate = 300;
export const metadata = { title: "Latihan isyarat, SmartGloves" };

// Secara bawaan hanya isyarat yang sudah punya rule. Untuk menguji di laptop tanpa merekam semuanya,
// isi LATIHAN_SEMUA_KATA=true di .env.local (jangan di Vercel).
const HANYA_YANG_PUNYA_RULE = process.env.LATIHAN_SEMUA_KATA !== "true";

async function ambilKata(): Promise<Kata[]> {
  try {
    const snap = await adminDb.collection("signs").where("aktif", "==", true).get();
    return snap.docs
      .map((d) => {
        const x = d.data();
        const kondisi = normKondisi(x.kondisi);
        const kat = String(x.kategori ?? "kata");
        return {
          id: d.id,
          nama: String(x.nama_isyarat ?? ""),
          teks: String(x.teks_output ?? ""),
          kategori: (KATEGORI as readonly string[]).includes(kat) ? (kat as Kategori) : "kata",
          bahasa: normBahasa(x.bahasa),
          tangan: jenisTangan(kondisi),
          siap: kondisi.length > 0,
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
      <LatihanBahasa kata={kata} />
    </main>
  );
}
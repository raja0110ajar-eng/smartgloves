import { adminDb } from "@/lib/firebaseAdmin";
import { KATEGORI, type Kategori } from "@/lib/kategori";
import { KAMUS_HANYA_SIAP } from "@/lib/kamusAturan";
import { normBahasa } from "@/lib/bahasa";
import { jenisTangan, normKondisi } from "@/lib/pose";
import KamusKlien, { type KataKamus } from "@/components/KamusKlien";

export const revalidate = 300;
export const metadata = { title: "Kamus isyarat, SmartGloves" };

async function ambilKata(): Promise<KataKamus[]> {
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
          audio_url: String(x.audio_url ?? ""),
          siap: kondisi.length > 0,
        };
      })
      .filter((k) => !KAMUS_HANYA_SIAP || k.siap)
      .map(({ siap: _siap, ...k }) => k)
      .sort((a, b) => a.bahasa.localeCompare(b.bahasa) || a.nama.localeCompare(b.nama, "id"));
  } catch {
    return [];
  }
}

export default async function KamusPage() {
  const kata = await ambilKata();

  return (
    <main className="kontainer bagian">
      <h1>Kamus isyarat</h1>
      <p style={{ color: "var(--redup)" }}>
        Daftar isyarat yang saat ini bisa dikenali SmartGloves, dalam SIBI dan BISINDO.
      </p>

      {kata.length === 0 ? (
        <div className="kartu">
          <p>Belum ada kata yang terdaftar.</p>
        </div>
      ) : (
        <KamusKlien kata={kata} />
      )}
    </main>
  );
}
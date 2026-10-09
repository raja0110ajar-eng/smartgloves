import { adminDb } from "@/lib/firebaseAdmin";
import { KATEGORI, type Kategori } from "@/lib/kategori";
import KamusKlien, { type KataKamus } from "@/components/KamusKlien";

export const revalidate = 300;
export const metadata = { title: "Kamus isyarat, SmartGloves" };

// true = hanya kata yang sudah punya rule (benar-benar bisa dikenali sarung tangan)
// false = semua kata aktif
const HANYA_YANG_PUNYA_RULE = true;

async function ambilKata(): Promise<KataKamus[]> {
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
          audio_url: String(x.audio_url ?? ""),
          siap: Array.isArray(x.kondisi) && x.kondisi.length > 0,
        };
      })
      .filter((k) => !HANYA_YANG_PUNYA_RULE || k.siap)
      .map(({ siap: _siap, ...k }) => k)
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
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
        Daftar kata yang saat ini bisa dikenali SmartGloves.
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
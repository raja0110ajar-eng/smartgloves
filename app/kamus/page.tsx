import { adminDb } from "@/lib/firebaseAdmin";

export const revalidate = 300;
export const metadata = { title: "Kamus isyarat, SmartGloves" };

// true = hanya kata yang sudah punya rule (benar-benar bisa dikenali sarung tangan)
// false = semua kata aktif
const HANYA_YANG_PUNYA_RULE = true;

type Kata = { id: string; nama: string; teks: string; siap: boolean };

async function ambilKata(): Promise<Kata[]> {
  try {
    const snap = await adminDb.collection("signs").where("aktif", "==", true).get();
    return snap.docs
      .map((d) => {
        const x = d.data();
        return {
          id: d.id,
          nama: String(x.nama_isyarat ?? ""),
          teks: String(x.teks_output ?? ""),
          siap: Array.isArray(x.kondisi) && x.kondisi.length > 0,
        };
      })
      .filter((k) => !HANYA_YANG_PUNYA_RULE || k.siap)
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
        <div className="grid3">
          {kata.map((k) => (
            <div key={k.id} className="kartu">
              <h3>{k.nama}</h3>
              <p>{k.teks}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
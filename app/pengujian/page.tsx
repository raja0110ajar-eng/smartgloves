import { adminDb } from "@/lib/firebaseAdmin";
import { SesiSchema, hitungStatistik, type SesiData } from "@/lib/evaluasi";

export const revalidate = 600;
export const metadata = { title: "Pengujian, SmartGloves" };

const pct = (v: number) => `${Math.round(v * 100)}%`;
const detik = (ms: number | null) =>
  ms === null ? "-" : `${(ms / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} dtk`;

async function ambil() {
  try {
    const [sSnap, kSnap] = await Promise.all([
      adminDb.collection("evaluasi_sesi").orderBy("dibuat", "desc").limit(200).get(),
      adminDb.collection("signs").select("teks_output").get(),
    ]);
    const sesi: SesiData[] = sSnap.docs.flatMap((d) => {
      const x = d.data();
      const p = SesiSchema.safeParse({
        penguji: x.penguji,
        kondisi: x.kondisi ?? "",
        simulasi: x.simulasi === true,
        trials: x.trials,
      });
      return p.success ? [p.data] : [];
    });
    const nama = new Map(kSnap.docs.map((d) => [d.id, String(d.data().teks_output ?? d.id)]));
    const terakhir = sSnap.docs.find((d) => d.data().simulasi !== true)?.data().dibuat?.toMillis?.() ?? 0;
    return { stat: hitungStatistik(sesi), nama, terakhir };
  } catch {
    return null;
  }
}

export default async function PengujianPage() {
  const data = await ambil();
  const nama = (id: string) => data?.nama.get(id) ?? "(isyarat dihapus)";

  return (
    <main className="kontainer bagian">
      <h1>Hasil pengujian</h1>
      <p style={{ color: "var(--redup)" }}>
        Hasil uji sarung tangan sungguhan. Sesi yang memakai simulator tidak dihitung.
      </p>

      {!data || data.stat.totalTrial === 0 ? (
        <div className="kartu">
          <p>Belum ada hasil pengujian dengan perangkat asli.</p>
        </div>
      ) : (
        <>
          <div className="grid3">
            <div className="kartu">
              <h3>Akurasi keseluruhan</h3>
              <p>
                <strong style={{ fontSize: "1.6rem", color: "var(--teks)" }}>
                  {pct(data.stat.akurasi)}
                </strong>
                <br />
                Rentang kepercayaan 95%: {pct(data.stat.ciBawah)} sampai {pct(data.stat.ciAtas)}
              </p>
            </div>
            <div className="kartu">
              <h3>Jumlah data</h3>
              <p>
                {data.stat.totalTrial} percobaan
                <br />
                {data.stat.sesi} sesi, {data.stat.penguji} penguji
              </p>
            </div>
            <div className="kartu">
              <h3>Pembaruan terakhir</h3>
              <p>
                {data.terakhir
                  ? new Date(data.terakhir).toLocaleDateString("id-ID", { dateStyle: "long" })
                  : "-"}
              </p>
            </div>
          </div>

          <h2>Per isyarat</h2>
          <div className="tabel-wadah">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Isyarat</th>
                  <th>Percobaan</th>
                  <th>Benar</th>
                  <th>Akurasi (rentang 95%)</th>
                  <th>Tidak terdeteksi</th>
                  <th>Kecocokan rata-rata</th>
                  <th>Median waktu</th>
                  <th>Sering tertukar dengan</th>
                </tr>
              </thead>
              <tbody>
                {[...data.stat.perSign]
                  .sort((a, b) => nama(a.id).localeCompare(nama(b.id), "id"))
                  .map((s) => (
                    <tr key={s.id}>
                      <td>{nama(s.id)}</td>
                      <td>{s.n}</td>
                      <td>{s.benar}</td>
                      <td>
                        {pct(s.akurasi)} ({pct(s.ciBawah)} sampai {pct(s.ciAtas)})
                      </td>
                      <td>{s.tidakTerdeteksi}</td>
                      <td>{s.skorRata === null ? "-" : `${Math.round(s.skorRata)}%`}</td>
                      <td>{detik(s.latensiMedian)}</td>
                      <td>
                        {s.tertukar.length
                          ? s.tertukar.map((t) => `${nama(t.id)} (${t.jumlah}x)`).join(", ")
                          : "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {data.stat.kondisi.length > 0 && (
            <>
              <h2>Kondisi pengujian</h2>
              <ul>
                {data.stat.kondisi.slice(0, 8).map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <h2>Cara pengujian</h2>
      <div className="markdown">
        <ul>
          <li>
            Penguji diminta memperagakan satu isyarat yang ditampilkan di layar. Urutan isyarat
            diacak.
          </li>
          <li>
            Deteksi <strong>pertama</strong> dalam 8 detik dicatat sebagai hasil. Benar kalau sama
            dengan target, salah kalau berbeda, dan tidak terdeteksi kalau tidak ada deteksi.
          </li>
          <li>Ada jeda 2 detik antar percobaan supaya pose sebelumnya tidak terbawa.</li>
          <li>
            Median waktu dihitung hanya dari deteksi yang benar, sejak target ditampilkan.{" "}
            <strong>Waktu ini termasuk waktu penguji membentuk pose</strong>, bukan hanya kecepatan
            sistem.
          </li>
          <li>
            Kecocokan menunjukkan seberapa dekat bacaan sensor dengan pose yang direkam, bukan
            peluang kebenaran.
          </li>
        </ul>
        <h3>Keterbatasan</h3>
        <ul>
          <li>
            Jumlah penguji dan percobaan terbatas. Rentang 95% menunjukkan bahwa angka dari
            percobaan sedikit masih sangat tidak pasti.
          </li>
          <li>Hasil bisa berbeda untuk orang lain, ukuran tangan lain, atau kondisi lain.</li>
          <li>
            Pengujian hanya mencakup isyarat satu tangan yang sudah terdaftar, bukan seluruh bahasa
            isyarat.
          </li>
        </ul>
      </div>
    </main>
  );
}
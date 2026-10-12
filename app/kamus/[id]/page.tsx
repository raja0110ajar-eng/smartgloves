import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebaseAdmin";
import { ID_RE } from "@/lib/detail";
import { KAMUS_HANYA_SIAP } from "@/lib/kamusAturan";
import { KATEGORI, LABEL_KATEGORI, type Kategori } from "@/lib/kategori";
import VideoYoutube from "@/components/VideoYoutube";
import TombolSuara from "@/components/TombolSuara";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

const ambil = cache(async (id: string) => {
  if (!ID_RE.test(id)) return null;
  try {
    const d = await adminDb.collection("signs").doc(id).get();
    const x = d.data();
    if (!d.exists || !x || x.aktif !== true) return null;
    const siap = Array.isArray(x.kondisi) && x.kondisi.length > 0;
    if (KAMUS_HANYA_SIAP && !siap) return null;

    const kat = String(x.kategori ?? "kata");
    const v = x.verifikasi && typeof x.verifikasi === "object" ? x.verifikasi : {};
    return {
      nama: String(x.nama_isyarat ?? ""),
      teks: String(x.teks_output ?? ""),
      kategori: ((KATEGORI as readonly string[]).includes(kat) ? kat : "kata") as Kategori,
      arti: String(x.arti ?? ""),
      panduan: String(x.panduan ?? ""),
      audio_url: String(x.audio_url ?? ""),
      gambar_url: String(x.gambar_url ?? ""),
      gambar_alt: String(x.gambar_alt ?? ""),
      video_id: String(x.video_id ?? ""),
      video_deskripsi: String(x.video_deskripsi ?? ""),
      diverifikasi: v.status === "diverifikasi" && !!v.oleh && !!v.tanggal,
      oleh: String(v.oleh ?? ""),
      tanggal: String(v.tanggal ?? ""),
    };
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const k = await ambil(id);
  return { title: k ? `${k.nama}, Kamus SmartGloves` : "Isyarat tidak ditemukan" };
}

export default async function DetailIsyarat({ params }: Props) {
  const { id } = await params;
  const k = await ambil(id);
  if (!k) notFound();

  const tanggal = k.tanggal
    ? new Date(`${k.tanggal}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" })
    : "";

  return (
    <main className="kontainer bagian">
      <p>
        <Link href="/kamus">← Kamus isyarat</Link>
      </p>
      <article className="detail">
        <header>
          <h1 style={{ marginBottom: "0.25rem" }}>{k.nama}</h1>
          <p style={{ margin: 0, color: "var(--redup)" }}>
            Teks yang tampil dan diucapkan: <strong>{k.teks}</strong> · Kategori:{" "}
            {LABEL_KATEGORI[k.kategori]}
          </p>
        </header>

        <p>
          <span className={`lencana ${k.diverifikasi ? "ok" : ""}`}>
            {k.diverifikasi
              ? `Diverifikasi oleh ${k.oleh} pada ${tanggal}`
              : "Belum diverifikasi oleh penutur asli. Anggap sebagai referensi awal."}
          </span>
        </p>

        {k.audio_url && (
          <p>
            <TombolSuara url={k.audio_url} />
          </p>
        )}

        {k.arti && (
          <section>
            <h2>Arti</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{k.arti}</p>
          </section>
        )}

        {k.panduan && (
          <section>
            <h2>Panduan penggunaan</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{k.panduan}</p>
          </section>
        )}

        {k.gambar_url && (
          <section>
            <h2>Foto</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={k.gambar_url} alt={k.gambar_alt} loading="lazy" decoding="async" />
          </section>
        )}

        {k.video_id && (
          <section>
            <h2>Video</h2>
            <VideoYoutube id={k.video_id} deskripsi={k.video_deskripsi} />
          </section>
        )}

        {!k.arti && !k.panduan && !k.gambar_url && !k.video_id && (
          <p style={{ color: "var(--redup)" }}>Penjelasan isyarat ini belum ditambahkan.</p>
        )}

        <p className="catatan" style={{ maxWidth: "none" }}>
          Halaman ini bukan pengganti belajar langsung dari penutur asli bahasa isyarat.
        </p>
      </article>
    </main>
  );
}
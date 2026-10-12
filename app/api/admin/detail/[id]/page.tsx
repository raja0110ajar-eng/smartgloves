"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { useAdmin } from "@/lib/useAdmin";
import { ubahKeWebp } from "@/lib/gambarBrowser";
import { idYoutube } from "@/lib/youtube";

type Form = {
  arti: string;
  panduan: string;
  status: "belum" | "diverifikasi";
  oleh: string;
  tanggal: string;
  gambar_url: string;
  gambar_alt: string;
  video: string;
  video_deskripsi: string;
};

const KOSONG: Form = {
  arti: "",
  panduan: "",
  status: "belum",
  oleh: "",
  tanggal: "",
  gambar_url: "",
  gambar_alt: "",
  video: "",
  video_deskripsi: "",
};

export default function DetailAdmin() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { ready, isAdmin, api } = useAdmin();
  const [judul, setJudul] = useState("");
  const [f, setF] = useState<Form>(KOSONG);
  const [dimuat, setDimuat] = useState(false);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muat = useCallback(async () => {
    const d = await api(`/api/admin/detail?id=${encodeURIComponent(id)}`);
    setJudul(`${d.nama_isyarat} (${d.teks_output})`);
    setF({
      arti: d.detail.arti,
      panduan: d.detail.panduan,
      status: d.detail.verifikasi.status,
      oleh: d.detail.verifikasi.oleh,
      tanggal: d.detail.verifikasi.tanggal,
      gambar_url: d.detail.gambar_url,
      gambar_alt: d.detail.gambar_alt,
      video: d.detail.video_id ? `https://youtu.be/${d.detail.video_id}` : "",
      video_deskripsi: d.detail.video_deskripsi,
    });
    setDimuat(true);
  }, [api, id]);

  useEffect(() => {
    if (isAdmin) muat().catch((e) => setPesan(e.message));
  }, [isAdmin, muat]);

  async function jalankan(aksi: () => Promise<string | void>) {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      const hasil = await aksi();
      if (hasil) setPesan(hasil);
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  function pilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    return jalankan(async () => {
      setPesan("Mengompres dan mengunggah...");
      const blob = await ubahKeWebp(file);
      const token = await auth.currentUser?.getIdToken();
      const fd = new FormData();
      fd.append("untuk", id);
      fd.append("file", blob, "gambar.webp");
      let res: Response;
      try {
        res = await fetch("/api/admin/media", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      } catch {
        throw new Error("Koneksi bermasalah. Periksa sinyal lalu coba lagi.");
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Gagal (HTTP ${res.status})`);
      setF((x) => ({ ...x, gambar_url: d.url }));
      return `Gambar terunggah (${(blob.size / 1024).toFixed(0)} KB). Isi teks alternatif lalu klik Simpan.`;
    });
  }

  function simpan() {
    return jalankan(async () => {
      const mentah = f.video.trim();
      const videoId = mentah
        ? (idYoutube(mentah) ?? (/^[A-Za-z0-9_-]{11}$/.test(mentah) ? mentah : null))
        : "";
      if (videoId === null) {
        throw new Error("Tautan YouTube tidak dikenali. Tempel tautan lengkapnya.");
      }
      await api("/api/admin/detail", "PUT", {
        id,
        arti: f.arti,
        panduan: f.panduan,
        verifikasi: { status: f.status, oleh: f.oleh, tanggal: f.tanggal },
        gambar_url: f.gambar_url,
        gambar_alt: f.gambar_alt,
        video_id: videoId,
        video_deskripsi: f.video_deskripsi,
      });
      return "Tersimpan. Halaman publik diperbarui dalam beberapa saat.";
    });
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <a href="/admin">← Daftar kata</a>
      </p>
      <h1>Detail: {judul || id}</h1>
      {pesan && <p>{pesan}</p>}

      {dimuat && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <label>
            Arti
            <textarea
              rows={2}
              maxLength={300}
              style={{ width: "100%" }}
              value={f.arti}
              onChange={(e) => setF({ ...f, arti: e.target.value })}
            />
          </label>

          <label>
            Panduan penggunaan (kapan dan bagaimana isyarat ini dipakai)
            <textarea
              rows={4}
              maxLength={600}
              style={{ width: "100%" }}
              value={f.panduan}
              onChange={(e) => setF({ ...f, panduan: e.target.value })}
            />
          </label>

          <section className="kartu" style={{ display: "grid", gap: "0.5rem" }}>
            <h2 style={{ margin: 0 }}>Verifikasi</h2>
            <p className="catatan" style={{ maxWidth: "none" }}>
              Pilih &quot;diverifikasi&quot; hanya kalau bentuk isyaratnya sudah diperiksa penutur
              asli atau guru bahasa isyarat.
            </p>
            <label>
              Status{" "}
              <select
                value={f.status}
                onChange={(e) => setF({ ...f, status: e.target.value as Form["status"] })}
              >
                <option value="belum">Belum diverifikasi</option>
                <option value="diverifikasi">Diverifikasi</option>
              </select>
            </label>
            {f.status === "diverifikasi" && (
              <>
                <input
                  placeholder="Diperiksa oleh (nama atau lembaga)"
                  maxLength={80}
                  value={f.oleh}
                  onChange={(e) => setF({ ...f, oleh: e.target.value })}
                />
                <label>
                  Tanggal pemeriksaan{" "}
                  <input
                    type="date"
                    value={f.tanggal}
                    onChange={(e) => setF({ ...f, tanggal: e.target.value })}
                  />
                </label>
              </>
            )}
          </section>

          <section className="kartu" style={{ display: "grid", gap: "0.5rem" }}>
            <h2 style={{ margin: 0 }}>Foto</h2>
            <p className="catatan" style={{ maxWidth: "none" }}>
              Foto buatan sendiri. Sebaiknya hanya tangan, tanpa wajah kecuali orangnya setuju.
              Foto dikompres otomatis ke WebP.
            </p>
            {f.gambar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.gambar_url}
                alt={f.gambar_alt || "Pratinjau"}
                style={{ maxWidth: "100%", borderRadius: 12 }}
              />
            )}
            <input type="file" accept="image/*" onChange={pilihGambar} disabled={sibuk} />
            {f.gambar_url && (
              <>
                <input
                  placeholder="Teks alternatif (jelaskan isi foto, wajib)"
                  maxLength={200}
                  value={f.gambar_alt}
                  onChange={(e) => setF({ ...f, gambar_alt: e.target.value })}
                />
                <div>
                  <button
                    type="button"
                    onClick={() => setF({ ...f, gambar_url: "", gambar_alt: "" })}
                    disabled={sibuk}
                  >
                    Lepas foto dari kata ini
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="kartu" style={{ display: "grid", gap: "0.5rem" }}>
            <h2 style={{ margin: 0 }}>Video</h2>
            <p className="catatan" style={{ maxWidth: "none" }}>
              Unggah video ke YouTube dengan status &quot;Tidak terdaftar&quot;, tambahkan
              subtitle, lalu tempel tautannya di sini.
            </p>
            <input
              placeholder="Tautan YouTube"
              value={f.video}
              onChange={(e) => setF({ ...f, video: e.target.value })}
            />
            {f.video.trim() && (
              <textarea
                rows={2}
                maxLength={500}
                placeholder="Deskripsi atau transkrip video (wajib)"
                style={{ width: "100%" }}
                value={f.video_deskripsi}
                onChange={(e) => setF({ ...f, video_deskripsi: e.target.value })}
              />
            )}
          </section>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={simpan} disabled={sibuk}>
              {sibuk ? "Memproses..." : "Simpan"}
            </button>
            <a href={`/kamus/${id}`} target="_blank" rel="noreferrer">
              Lihat halaman publik →
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
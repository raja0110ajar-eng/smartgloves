"use client";

import { useRef, useState } from "react";
import { auth } from "@/lib/firebaseClient";
import { useAdmin } from "@/lib/useAdmin";
import { ubahKeWebp } from "@/lib/gambarBrowser";

export default function MediaAdmin() {
  const { ready, isAdmin } = useAdmin();
  const [alt, setAlt] = useState("");
  const [hasil, setHasil] = useState<{ url: string; kb: number } | null>(null);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || kunci.current) return;
    if (!alt.trim()) {
      setPesan("Isi teks alternatif dulu (jelaskan isi foto), lalu pilih fotonya.");
      return;
    }
    kunci.current = true;
    setSibuk(true);
    setHasil(null);
    try {
      setPesan("Mengompres dan mengunggah...");
      const blob = await ubahKeWebp(file);
      const token = await auth.currentUser?.getIdToken();
      const fd = new FormData();
      fd.append("untuk", "umum");
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
      setHasil({ url: d.url, kb: Math.round(blob.size / 1024) });
      setPesan("Selesai. Salin kode Markdown di bawah ke halaman yang kamu mau.");
    } catch (err) {
      setPesan((err as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  async function salin(teks: string) {
    try {
      await navigator.clipboard.writeText(teks);
      setPesan("Disalin.");
    } catch {
      setPesan("Gagal menyalin. Sorot teksnya lalu salin manual.");
    }
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  const markdown = hasil ? `![${alt.trim().replace(/[\[\]]/g, "")}](${hasil.url})` : "";

  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Media</h1>
      <p style={{ color: "var(--redup)" }}>
        Unggah foto untuk halaman informasi (misalnya Dokumentasi). Foto dikecilkan otomatis ke
        WebP dan metadatanya (termasuk lokasi) terbuang. Sebaiknya hanya tangan atau perangkat,
        tanpa wajah kecuali orangnya setuju.
      </p>

      <input
        placeholder="Teks alternatif: jelaskan isi foto (wajib)"
        maxLength={200}
        style={{ width: "100%", marginBottom: "0.75rem" }}
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
      />
      <input type="file" accept="image/*" onChange={pilih} disabled={sibuk} />
      {pesan && <p>{pesan}</p>}

      {hasil && (
        <section className="kartu" style={{ display: "grid", gap: "0.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hasil.url} alt={alt} style={{ maxWidth: "100%", borderRadius: 12 }} />
          <div>Ukuran: {hasil.kb} KB</div>
          <textarea readOnly rows={3} style={{ width: "100%" }} value={markdown} />
          <div>
            <button onClick={() => salin(markdown)}>Salin kode Markdown</button>
          </div>
        </section>
      )}
    </main>
  );
}
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAdmin } from "@/lib/useAdmin";
import { buatSlug } from "@/lib/slug";

type Halaman = {
  slug: string;
  judul: string;
  isi: string;
  urutan: number;
  tampil: boolean;
};

const KOSONG: Halaman = { slug: "", judul: "", isi: "", urutan: 10, tampil: true };

export default function HalamanAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [daftar, setDaftar] = useState<Halaman[]>([]);
  const [form, setForm] = useState<Halaman | null>(null);
  const [baru, setBaru] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [lihat, setLihat] = useState(false);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muat = useCallback(async () => {
    const d = await api("/api/admin/halaman");
    setDaftar(d.halaman);
  }, [api]);

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
      await muat();
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  function mulaiBaru() {
    setForm(KOSONG);
    setBaru(true);
    setSlugManual(false);
    setLihat(false);
    setPesan("");
  }

  function mulaiUbah(h: Halaman) {
    setForm(h);
    setBaru(false);
    setLihat(false);
    setPesan("");
  }

  function ubahJudul(judul: string) {
    if (!form) return;
    setForm({
      ...form,
      judul,
      ...(baru && !slugManual ? { slug: buatSlug(judul) } : {}),
    });
  }

  function simpan() {
    if (!form) return;
    return jalankan(async () => {
      await api("/api/admin/halaman", baru ? "POST" : "PUT", form);
      setForm(null);
      return baru ? "Halaman dibuat." : "Halaman disimpan.";
    });
  }

  function hapus(h: Halaman) {
    if (!confirm(`Hapus halaman "${h.judul}" secara permanen?`)) return;
    return jalankan(async () => {
      await api("/api/admin/halaman", "DELETE", { slug: h.slug });
      if (form?.slug === h.slug) setForm(null);
      return "Halaman dihapus.";
    });
  }

  function buatContoh() {
    return jalankan(async () => {
      const d = await api("/api/admin/halaman/contoh", "POST");
      return d.dibuat > 0
        ? `${d.dibuat} halaman contoh dibuat.`
        : "Halaman contoh sudah ada semua.";
    });
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <a href="/admin">← Kembali</a>
      </p>
      <h1>Halaman informasi</h1>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={mulaiBaru} disabled={sibuk}>
          + Halaman baru
        </button>
        <button onClick={buatContoh} disabled={sibuk}>
          Buat halaman contoh
        </button>
      </div>

      {pesan && <p>{pesan}</p>}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", margin: "1rem 0" }}>
        {daftar.map((h) => (
          <li
            key={h.slug}
            style={{
              border: "1px solid var(--garis)",
              borderRadius: 8,
              padding: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              opacity: h.tampil ? 1 : 0.55,
            }}
          >
            <span>
              <strong>{h.judul}</strong>{" "}
              <span style={{ color: "var(--redup)" }}>
                /{h.slug} · urutan {h.urutan} · {h.tampil ? "tampil" : "disembunyikan"}
              </span>
            </span>
            <span style={{ display: "flex", gap: "0.5rem" }}>
              {h.tampil && (
                <a href={`/${h.slug}`} target="_blank" rel="noreferrer">
                  <button type="button">Lihat</button>
                </a>
              )}
              <button onClick={() => mulaiUbah(h)} disabled={sibuk}>
                Ubah
              </button>
              <button onClick={() => hapus(h)} disabled={sibuk}>
                Hapus
              </button>
            </span>
          </li>
        ))}
        {daftar.length === 0 && (
          <li style={{ color: "var(--redup)" }}>
            Belum ada halaman. Klik "Buat halaman contoh" untuk memulai.
          </li>
        )}
      </ul>

      {form && (
        <section className="kartu" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>{baru ? "Halaman baru" : `Ubah: ${form.judul}`}</h2>

          <label>
            Judul
            <input
              style={{ width: "100%" }}
              value={form.judul}
              onChange={(e) => ubahJudul(e.target.value)}
            />
          </label>

          <label>
            Alamat (setelah garis miring, mis. tentang)
            <input
              style={{ width: "100%" }}
              value={form.slug}
              disabled={!baru}
              onChange={(e) => {
                setSlugManual(true);
                setForm({ ...form, slug: e.target.value.toLowerCase() });
              }}
            />
          </label>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <label>
              Urutan di menu{" "}
              <input
                type="number"
                min={0}
                max={999}
                style={{ width: 90 }}
                value={form.urutan}
                onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.tampil}
                onChange={(e) => setForm({ ...form, tampil: e.target.checked })}
              />{" "}
              Tampilkan di web
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" onClick={() => setLihat(false)} disabled={!lihat}>
              Tulis
            </button>
            <button type="button" onClick={() => setLihat(true)} disabled={lihat}>
              Pratinjau
            </button>
          </div>

          {lihat ? (
            <div className="markdown" style={{ minHeight: 200 }}>
              <Markdown remarkPlugins={[remarkGfm]}>{form.isi}</Markdown>
            </div>
          ) : (
            <textarea
              rows={16}
              style={{ width: "100%", fontFamily: "ui-monospace, monospace" }}
              value={form.isi}
              onChange={(e) => setForm({ ...form, isi: e.target.value })}
            />
          )}

          <p style={{ margin: 0, color: "var(--redup)", fontSize: "0.9rem" }}>
            Contoh Markdown: <code>## Judul bagian</code>, <code>**tebal**</code>,{" "}
            <code>- poin daftar</code>, <code>[teks tautan](https://contoh.com)</code>,{" "}
            <code>![deskripsi](/gambar/foto.jpg)</code>
          </p>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={simpan} disabled={sibuk}>
              {sibuk ? "Menyimpan..." : "Simpan"}
            </button>
            <button onClick={() => setForm(null)} disabled={sibuk}>
              Batal
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
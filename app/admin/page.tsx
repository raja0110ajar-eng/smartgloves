"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { useAdmin } from "@/lib/useAdmin";

type Sign = {
  id: string;
  nama_isyarat: string;
  teks_output: string;
  aktif: boolean;
  audio_url: string;
  punya_rule: boolean;
};

type Edit = { id: string; nama: string; teks: string };

export default function AdminPage() {
  const router = useRouter();
  const { ready, isAdmin, api } = useAdmin();
  const [signs, setSigns] = useState<Sign[]>([]);
  const [nama, setNama] = useState("");
  const [teks, setTeks] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muat = useCallback(async () => {
    const data = await api("/api/admin/signs");
    setSigns(data.signs);
  }, [api]);

  useEffect(() => {
    if (isAdmin) muat().catch((e) => setPesan(e.message));
  }, [isAdmin, muat]);

  // Semua aksi lewat sini. Kalau masih ada yang berjalan, ketukan berikutnya diabaikan.
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

  function tambah(e: React.FormEvent) {
    e.preventDefault();
    return jalankan(async () => {
      await api("/api/admin/signs", "POST", {
        nama_isyarat: nama,
        teks_output: teks,
      });
      setNama("");
      setTeks("");
      return "Kata ditambahkan.";
    });
  }

  function simpanEdit() {
    if (!edit) return;
    return jalankan(async () => {
      const d = await api("/api/admin/signs", "PUT", {
        id: edit.id,
        nama_isyarat: edit.nama,
        teks_output: edit.teks,
      });
      setEdit(null);
      return d.perlu_audio
        ? "Tersimpan. Teks berubah, jalankan skrip audio untuk membuat suara barunya."
        : "Tersimpan.";
    });
  }

  function ubahAktif(s: Sign) {
    return jalankan(async () => {
      await api("/api/admin/signs", "PATCH", { id: s.id, aktif: !s.aktif });
      return s.aktif
        ? `"${s.teks_output}" dinonaktifkan.`
        : `"${s.teks_output}" diaktifkan.`;
    });
  }

  function hapus(s: Sign) {
    if (!confirm(`Hapus permanen "${s.teks_output}"? Ini tidak bisa dibatalkan.`)) return;
    return jalankan(async () => {
      await api("/api/admin/signs", "DELETE", { id: s.id });
      return "Dihapus.";
    });
  }

  function simulasi(s: Sign) {
    return jalankan(async () => {
      await api("/api/admin/simulate", "POST", { sign_id: s.id });
      return `Terkirim: ${s.teks_output}`;
    });
  }

  function bersihkan() {
    return jalankan(async () => {
      const cek = await api("/api/admin/signs/bersihkan", "POST", { simulasi: true });
      if (cek.jumlah === 0) return "Tidak ada duplikat.";
      const lanjut = confirm(
        `${cek.jumlah} duplikat akan dihapus permanen:\n\n${cek.daftar.join("\n")}\n\nLanjutkan?`
      );
      if (!lanjut) return "Dibatalkan.";
      const d = await api("/api/admin/signs/bersihkan", "POST", { simulasi: false });
      return `${d.jumlah} duplikat dihapus.`;
    });
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Akun ini bukan admin.</p>
        <button onClick={() => signOut(auth).then(() => router.replace("/login"))}>
          Keluar
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 680,
        margin: "2rem auto",
        fontFamily: "system-ui",
        padding: "0 1rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Admin SmartGloves</h1>
        <button onClick={() => signOut(auth).then(() => router.replace("/login"))}>
          Keluar
        </button>
      </div>

      <p style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <a href="/admin/rekam">Mode Rekam →</a>
        <a href="/admin/ai">Asisten AI →</a>
      </p>

      <form onSubmit={tambah} style={{ display: "grid", gap: "0.5rem", margin: "1rem 0" }}>
        <input
          placeholder="Nama isyarat (mis. Halo)"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
        />
        <input
          placeholder="Teks yang tampil (mis. Halo)"
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          required
        />
        <button type="submit" disabled={sibuk}>
          {sibuk ? "Memproses..." : "Tambah kata"}
        </button>
      </form>

      {pesan && <p>{pesan}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Daftar kata ({signs.length})</h2>
        <button onClick={bersihkan} disabled={sibuk}>
          Bersihkan duplikat
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
        {signs.map((s) => (
          <li
            key={s.id}
            style={{
              border: "1px solid #555",
              borderRadius: 8,
              padding: "0.75rem",
              opacity: s.aktif ? 1 : 0.55,
            }}
          >
            {edit && edit.id === s.id ? (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <input
                  value={edit.nama}
                  onChange={(e) => setEdit({ ...edit, nama: e.target.value })}
                />
                <input
                  value={edit.teks}
                  onChange={(e) => setEdit({ ...edit, teks: e.target.value })}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={simpanEdit} disabled={sibuk}>
                    Simpan
                  </button>
                  <button onClick={() => setEdit(null)} disabled={sibuk}>
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <strong>{s.nama_isyarat}</strong> → {s.teks_output}
                </div>
                <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  {s.aktif ? "aktif" : "nonaktif"} ·{" "}
                  {s.punya_rule ? "ada rule" : "belum ada rule"} ·{" "}
                  {s.audio_url ? "ada audio" : "belum ada audio"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {s.audio_url && (
                    <button onClick={() => new Audio(s.audio_url).play()}>Putar</button>
                  )}
                  {s.aktif && (
                    <button onClick={() => simulasi(s)} disabled={sibuk}>
                      Simulasikan
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setEdit({ id: s.id, nama: s.nama_isyarat, teks: s.teks_output })
                    }
                    disabled={sibuk}
                  >
                    Ubah
                  </button>
                  <button onClick={() => ubahAktif(s)} disabled={sibuk}>
                    {s.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  {!s.aktif && (
                    <button onClick={() => hapus(s)} disabled={sibuk}>
                      Hapus
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
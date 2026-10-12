"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useAdmin } from "@/lib/useAdmin";
import { rapikanPesan } from "@/lib/tickerAturan";
import TeksBerjalan from "@/components/TeksBerjalan";

const MAKS_PESAN = 8;

export default function TickerAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [aktif, setAktif] = useState(true);
  const [pesan, setPesan] = useState<string[]>([]);
  const [info, setInfo] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muat = useCallback(async () => {
    const d = await api("/api/admin/ticker");
    setAktif(d.aktif);
    setPesan(d.pesan);
  }, [api]);

  useEffect(() => {
    if (isAdmin) muat().catch((e) => setInfo(e.message));
  }, [isAdmin, muat]);

  function ubah(i: number, nilai: string) {
    setPesan(pesan.map((p, j) => (j === i ? nilai : p)));
  }
  function pindah(i: number, arah: -1 | 1) {
    const j = i + arah;
    if (j < 0 || j >= pesan.length) return;
    const baru = [...pesan];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    setPesan(baru);
  }

  async function simpan() {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      const rapi = rapikanPesan(pesan);
      await api("/api/admin/ticker", "PUT", { aktif, pesan: rapi });
      setPesan(rapi);
      setInfo("Tersimpan. Perubahan tampil di situs dalam beberapa saat.");
    } catch (e) {
      setInfo((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Teks berjalan</h1>
      <p style={{ color: "var(--redup)" }}>
        Pesan pendek yang bergulir di bawah header situs publik. Maksimal {MAKS_PESAN} pesan, tiap
        pesan 140 karakter. Pengunjung bisa menghentikannya dengan tombol jeda.
      </p>
      {info && <p>{info}</p>}

      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "1rem 0" }}>
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
        Tampilkan teks berjalan di situs
      </label>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
        {pesan.map((p, i) => (
          <li key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <input
              value={p}
              maxLength={140}
              style={{ flex: 1, minWidth: 0 }}
              aria-label={`Pesan ${i + 1}`}
              onChange={(e) => ubah(i, e.target.value)}
            />
            <button type="button" onClick={() => pindah(i, -1)} disabled={i === 0} aria-label="Naikkan">
              <ArrowUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => pindah(i, 1)}
              disabled={i === pesan.length - 1}
              aria-label="Turunkan"
            >
              <ArrowDown size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPesan(pesan.filter((_, j) => j !== i))}
              aria-label="Hapus pesan"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
        {pesan.length === 0 && (
          <li style={{ color: "var(--redup)" }}>
            Belum ada pesan. Tambahkan satu supaya teks berjalan tampil.
          </li>
        )}
      </ul>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setPesan([...pesan, ""])}
          disabled={pesan.length >= MAKS_PESAN}
        >
          <Plus size={16} aria-hidden="true" /> Tambah pesan
        </button>
        <button type="button" onClick={simpan} disabled={sibuk}>
          {sibuk ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <h2 style={{ marginTop: "2rem" }}>Pratinjau</h2>
      <div style={{ border: "1px solid var(--garis)", borderRadius: 8, overflow: "hidden" }}>
        <TeksBerjalan pesan={rapikanPesan(pesan)} />
      </div>
    </main>
  );
}
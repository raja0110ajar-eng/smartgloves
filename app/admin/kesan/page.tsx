"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";

type Item = { id: string; nama: string; asal: string; pesan: string; status: string; tinjau: string; dibuat: number };
type Saring = "menunggu" | "tampil" | "disembunyikan" | "semua";

const ALASAN: Record<string, string> = {
  tautan: "memuat tautan",
  kontak: "memuat nomor atau email",
  kata: "memuat kata kasar atau spam",
  berulang: "huruf berulang",
};

export default function KesanAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [daftar, setDaftar] = useState<Item[]>([]);
  const [otomatis, setOtomatis] = useState(false);
  const [saring, setSaring] = useState<Saring>("menunggu");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muat = useCallback(async () => {
    const d = await api("/api/admin/kesan");
    setDaftar(d.daftar);
    setOtomatis(d.otomatis);
  }, [api]);

  useEffect(() => {
    if (isAdmin) muat().catch((e) => setPesan(e.message));
  }, [isAdmin, muat]);

  async function aksi(id: string, a: "tampil" | "sembunyi" | "hapus") {
    if (a === "hapus" && !confirm("Hapus pesan ini permanen?")) return;
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      await api("/api/admin/kesan", "POST", { id, aksi: a });
      await muat();
      setPesan("");
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  const hitung = (s: string) => daftar.filter((x) => x.status === s).length;
  const tampil = daftar.filter((x) => saring === "semua" || x.status === saring);

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Kesan dan pesan</h1>
      <p style={{ color: "var(--redup)" }}>
        Mode saat ini: <strong>{otomatis ? "tampil langsung (kecuali ditahan penyaring)" : "disetujui manual"}</strong>. Ubah lewat
        variabel KESAN_OTOMATIS di Vercel. Pesan yang disembunyikan tidak tampil di halaman publik.
      </p>
      {pesan && <p>{pesan}</p>}

      <div className="chips" role="group" aria-label="Saring status" style={{ margin: "0.75rem 0" }}>
        {(["menunggu", "tampil", "disembunyikan", "semua"] as const).map((s) => (
          <button key={s} className="chip" aria-pressed={saring === s} onClick={() => setSaring(s)}>
            {s === "semua" ? `Semua (${daftar.length})` : `${s[0].toUpperCase()}${s.slice(1)} (${hitung(s)})`}
          </button>
        ))}
        <button className="chip" onClick={() => muat().catch((e) => setPesan(e.message))}>Segarkan</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.6rem" }}>
        {tampil.length === 0 && <li style={{ color: "var(--redup)" }}>Tidak ada pesan.</li>}
        {tampil.map((k) => (
          <li key={k.id} className="kartu" style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{k.pesan}</div>
            <div className="catatan" style={{ maxWidth: "none" }}>
              <strong>{k.nama || "Pengunjung"}</strong>
              {k.asal ? `, ${k.asal}` : ""} · {new Date(k.dibuat).toLocaleString("id-ID")} · <span className="lencana">{k.status}</span>
              {k.tinjau && <span style={{ color: "#ffb84d" }}> · perlu ditinjau: {ALASAN[k.tinjau] ?? k.tinjau}</span>}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {k.status !== "tampil" && <button onClick={() => aksi(k.id, "tampil")} disabled={sibuk}>Setujui dan tampilkan</button>}
              {k.status === "tampil" && <button onClick={() => aksi(k.id, "sembunyi")} disabled={sibuk}>Sembunyikan</button>}
              {k.status === "menunggu" && <button onClick={() => aksi(k.id, "sembunyi")} disabled={sibuk}>Tolak</button>}
              <button onClick={() => aksi(k.id, "hapus")} disabled={sibuk}>Hapus</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
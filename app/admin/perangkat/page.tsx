"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";
import { kondisiPerangkat, teksDurasi } from "@/lib/statusBantu";

type P = { id: string; detikLalu: number | null; fw: string; rssi: number | null };

const LABEL = {
  belum: "Belum pernah terhubung",
  online: "Online",
  putus: "Tidak terlihat",
} as const;

export default function PerangkatAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [daftar, setDaftar] = useState<P[]>([]);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muat = useCallback(async () => {
    const d = await api("/api/admin/perangkat");
    setDaftar(d.perangkat);
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

  const simulasi = (aksi: "hidup" | "putus") =>
    jalankan(async () => {
      await api("/api/admin/perangkat", "POST", { aksi });
      return aksi === "hidup" ? "Simulasi: perangkat hidup." : "Simulasi: perangkat putus.";
    });

  const hapus = (p: P) => {
    if (!confirm(`Hapus catatan perangkat "${p.id}"?`)) return;
    return jalankan(async () => {
      await api("/api/admin/perangkat", "DELETE", { id: p.id });
      return "Catatan dihapus.";
    });
  };

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Perangkat</h1>
      <p style={{ color: "var(--redup)" }}>
        Perangkat dianggap online kalau memeriksa ruleset dalam 150 detik terakhir. Ini berarti ESP32
        terhubung ke server, bukan berarti sarung tangan sedang dipakai. Hapus catatan
        &quot;simulator&quot; sebelum demo supaya status hanya mencerminkan perangkat asli.
      </p>
      {pesan && <p>{pesan}</p>}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={() => muat().catch((e) => setPesan(e.message))} disabled={sibuk}>
          Segarkan
        </button>
        <button onClick={() => simulasi("hidup")} disabled={sibuk}>
          Simulasikan perangkat hidup
        </button>
        <button onClick={() => simulasi("putus")} disabled={sibuk}>
          Simulasikan perangkat putus
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
        {daftar.length === 0 && (
          <li style={{ color: "var(--redup)" }}>Belum ada perangkat yang tercatat.</li>
        )}
        {daftar.map((p) => {
          const k = kondisiPerangkat(p.detikLalu);
          return (
            <li
              key={p.id}
              className="kartu"
              style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}
            >
              <span style={{ display: "grid", gap: "0.2rem" }}>
                <strong>{p.id}</strong>
                <span>
                  <span className={`titik ${k}`} aria-hidden="true" /> {LABEL[k]}
                  {p.detikLalu !== null && ` (${teksDurasi(p.detikLalu)})`}
                </span>
                <span style={{ color: "var(--redup)", fontSize: "0.85rem" }}>
                  Firmware: {p.fw || "-"} · Sinyal WiFi: {p.rssi === null ? "-" : `${p.rssi} dBm`}
                </span>
              </span>
              <button onClick={() => hapus(p)} disabled={sibuk}>
                Hapus
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
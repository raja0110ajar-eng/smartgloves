"use client";

import { useRef, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";

type Hasil = {
  simulasi: boolean;
  total: number;
  perluBahasa: number;
  perluSensor: number;
  diubah: number;
};

export default function MigrasiAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  async function jalankan(simulasi: boolean) {
    if (kunci.current) return;
    if (!simulasi && !confirm("Terapkan migrasi ke semua kata? Sebaiknya unduh cadangan dulu.")) return;
    kunci.current = true;
    setSibuk(true);
    try {
      const d: Hasil = await api("/api/admin/migrasi", "POST", { simulasi });
      setHasil(d);
      setPesan(
        simulasi
          ? "Pemeriksaan selesai. Belum ada yang diubah."
          : "Migrasi selesai dan ruleset diperbarui."
      );
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Migrasi ke dua tangan</h1>
      <p style={{ color: "var(--redup)" }}>
        Kata lama diberi bahasa SIBI, dan kunci sensor lama diubah menjadi tangan kanan (awalan
        R_). Jalankan sekali. Unduh cadangan dulu di halaman Cadangan.
      </p>
      {pesan && <p>{pesan}</p>}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={() => jalankan(true)} disabled={sibuk}>
          Periksa dulu
        </button>
        <button onClick={() => jalankan(false)} disabled={sibuk || !hasil || hasil.diubah === 0}>
          Terapkan migrasi
        </button>
      </div>
      {hasil && (
        <ul style={{ marginTop: "1rem" }}>
          <li>Total kata: {hasil.total}</li>
          <li>Perlu diberi bahasa SIBI: {hasil.perluBahasa}</li>
          <li>Perlu mengubah kunci sensor: {hasil.perluSensor}</li>
          <li>Dokumen yang berubah: {hasil.diubah}</li>
        </ul>
      )}
    </main>
  );
}
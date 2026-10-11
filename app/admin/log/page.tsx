"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";

type Baris = { id: string; email: string; method: string; path: string; waktu: number };

const NAMA: Record<string, string> = {
  "POST /api/admin/signs": "Tambah kata",
  "PUT /api/admin/signs": "Ubah kata",
  "PATCH /api/admin/signs": "Aktifkan atau nonaktifkan kata",
  "DELETE /api/admin/signs": "Hapus kata",
  "POST /api/admin/signs/bersihkan": "Bersihkan duplikat",
  "POST /api/admin/simulate": "Simulasi gerakan",
  "POST /api/admin/rules": "Simpan rule pose",
  "POST /api/admin/halaman": "Buat halaman",
  "PUT /api/admin/halaman": "Ubah halaman",
  "DELETE /api/admin/halaman": "Hapus halaman",
  "POST /api/admin/halaman/contoh": "Buat halaman contoh",
  "POST /api/admin/ai/terapkan": "Terapkan aksi Asisten AI",
  "POST /api/admin/audio": "Unggah audio",
};

export default function LogAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [log, setLog] = useState<Baris[]>([]);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    setSibuk(true);
    try {
      const d = await api("/api/admin/log");
      setLog(d.log);
      setPesan("");
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      setSibuk(false);
    }
  }, [api]);

  useEffect(() => {
    if (isAdmin) muat();
  }, [isAdmin, muat]);

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Aktivitas admin</h1>
      <p style={{ color: "var(--redup)" }}>
        50 permintaan terakhir yang mengubah data. Ini mencatat permintaan yang diterima,
        bukan jaminan bahwa hasilnya berhasil.
      </p>
      <button onClick={muat} disabled={sibuk}>
        {sibuk ? "Memuat..." : "Segarkan"}
      </button>
      {pesan && <p>{pesan}</p>}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
        {log.length === 0 && !sibuk && (
          <li style={{ color: "var(--redup)" }}>Belum ada aktivitas tercatat.</li>
        )}
        {log.map((b) => (
          <li key={b.id} className="kartu">
            <strong>{NAMA[`${b.method} ${b.path}`] ?? `${b.method} ${b.path}`}</strong>
            <div style={{ color: "var(--redup)", fontSize: "0.85rem" }}>
              {b.waktu ? new Date(b.waktu).toLocaleString("id-ID") : "-"} · {b.email}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
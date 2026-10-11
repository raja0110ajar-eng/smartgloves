"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";

type Info = { nama: "gemini" | "openrouter"; siap: boolean; model: string };
type Pakai = { coba: number; ok: number };
type Status = {
  urutan: string[];
  penyedia: Info[];
  pakai: { tanggal: string; gemini: Pakai; openrouter: Pakai };
};
type Tes = { ok: boolean; ms: number; pesan: string };

const NAMA = { gemini: "Gemini", openrouter: "OpenRouter" };

export default function StatusAi() {
  const { ready, isAdmin, api } = useAdmin();
  const [status, setStatus] = useState<Status | null>(null);
  const [hasil, setHasil] = useState<Record<string, Tes>>({});
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muat = useCallback(async () => {
    try {
      setStatus(await api("/api/admin/ai/status"));
    } catch (e) {
      setPesan((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    if (isAdmin) muat();
  }, [isAdmin, muat]);

  async function tes(nama: string) {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      const t = await api("/api/admin/ai/status", "POST", { penyedia: nama });
      setHasil((h) => ({ ...h, [nama]: t }));
      await muat();
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
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <a href="/admin/ai">← Asisten AI</a>
      </p>
      <h1>Status penyedia AI</h1>
      {pesan && <p>{pesan}</p>}

      {status && (
        <>
          <p style={{ color: "var(--redup)" }}>
            Urutan percobaan: {status.urutan.map((u) => NAMA[u as keyof typeof NAMA]).join(" → ")}.
            Tiap penyedia dicoba satu kali per permintaan. Hitungan di bawah untuk{" "}
            {status.pakai.tanggal} (WIB) dan hanya perkiraan. Tombol Tes ikut menghitung sebagai
            satu percobaan, jadi pakai seperlunya.
          </p>

          <div style={{ display: "grid", gap: "1rem" }}>
            {status.penyedia.map((p) => {
              const pakai = status.pakai[p.nama];
              const t = hasil[p.nama];
              return (
                <section key={p.nama} className="kartu" style={{ display: "grid", gap: "0.5rem" }}>
                  <h2 style={{ margin: 0 }}>{NAMA[p.nama]}</h2>
                  <div>
                    Status: {p.siap ? "siap dipakai" : "belum dikonfigurasi"}
                  </div>
                  <div style={{ color: "var(--redup)", overflowWrap: "anywhere" }}>
                    Model: {p.model || "(kosong)"}
                  </div>
                  <div>
                    Hari ini: {pakai.coba} percobaan, {pakai.ok} berhasil
                  </div>
                  <div>
                    <button onClick={() => tes(p.nama)} disabled={sibuk || !p.siap}>
                      {sibuk ? "Memproses..." : "Tes koneksi"}
                    </button>
                  </div>
                  {t && (
                    <p
                      style={{
                        margin: 0,
                        color: t.ok ? undefined : "#ff8a8a",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {t.ok ? "Berhasil" : "Gagal"} ({t.ms} ms): {t.pesan}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
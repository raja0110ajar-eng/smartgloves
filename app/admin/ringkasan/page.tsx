"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";

type Pakai = { coba: number; ok: number };
type Ringkasan = {
  kata: {
    aktif: number;
    nonaktif: number;
    punyaRule: number;
    punyaAudio: number;
    perKategori: Record<string, number>;
    tanpaRule: string[];
    tanpaAudio: string[];
  };
  halaman: { tampil: number; tersembunyi: number };
  ruleset: { versi: number; diubah: number; jumlah: number };
  event: { hariIni: number; batas: number };
  ai: { tanggal: string; gemini: Pakai; openrouter: Pakai };
  tanya: { hariIni: number; batas: number };
  bentrok: string[];
  env: Record<string, boolean>;
};

const LABEL_ENV: Record<string, string> = {
  device_token: "Token perangkat (DEVICE_TOKEN)",
  supabase: "Penyimpanan audio (Supabase)",
  gemini: "Gemini",
  openrouter: "OpenRouter (cadangan)",
  turnstile: "CAPTCHA Turnstile",
  tanya_aktif: "Fitur Tanya SmartGloves aktif",
};

export default function RingkasanAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [r, setR] = useState<Ringkasan | null>(null);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    setSibuk(true);
    try {
      setR(await api("/api/admin/ringkasan"));
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

  const perhatian = r
    ? [
        ...(r.bentrok.length ? [`Rule saling tumpang tindih: ${r.bentrok.join("; ")}`] : []),
        ...(r.kata.tanpaRule.length
          ? [`Kata aktif belum punya rule: ${r.kata.tanpaRule.join(", ")}`]
          : []),
        ...(r.kata.tanpaAudio.length
          ? [`Kata aktif belum punya audio: ${r.kata.tanpaAudio.join(", ")}`]
          : []),
        ...["device_token", "supabase", "gemini"]
          .filter((k) => !r.env[k])
          .map((k) => `Belum dikonfigurasi: ${LABEL_ENV[k]}`),
      ]
    : [];

  return (
    <main style={{ maxWidth: 860, margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Ringkasan</h1>
        <button onClick={muat} disabled={sibuk}>
          {sibuk ? "Memuat..." : "Segarkan"}
        </button>
      </div>
      {pesan && <p>{pesan}</p>}

      {r && (
        <>
          <section className="kartu" style={{ margin: "1rem 0" }}>
            <h2 style={{ marginTop: 0 }}>Perlu perhatian</h2>
            {perhatian.length === 0 ? (
              <p style={{ margin: 0 }}>Tidak ada yang perlu diperhatikan.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                {perhatian.map((p, i) => (
                  <li key={i} style={{ overflowWrap: "anywhere" }}>
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid3">
            <div className="kartu">
              <h3>Kata</h3>
              <p>
                {r.kata.aktif} aktif, {r.kata.nonaktif} nonaktif
                <br />
                {r.kata.punyaRule} punya rule, {r.kata.punyaAudio} punya audio
                <br />
                {Object.entries(r.kata.perKategori)
                  .map(([k, n]) => `${k}: ${n}`)
                  .join(", ") || "belum ada kategori"}
              </p>
            </div>
            <div className="kartu">
              <h3>Halaman</h3>
              <p>
                {r.halaman.tampil} tampil, {r.halaman.tersembunyi} disembunyikan
              </p>
            </div>
            <div className="kartu">
              <h3>Ruleset</h3>
              <p>
                Versi {r.ruleset.versi}, {r.ruleset.jumlah} rule
                <br />
                {r.ruleset.diubah
                  ? `Diubah ${new Date(r.ruleset.diubah).toLocaleString("id-ID")}`
                  : "Belum pernah dibuat"}
              </p>
            </div>
            <div className="kartu">
              <h3>Event dari perangkat</h3>
              <p>
                {r.event.hariIni} dari batas {r.event.batas} hari ini
              </p>
            </div>
            <div className="kartu">
              <h3>Pemakaian AI hari ini</h3>
              <p>
                Gemini: {r.ai.gemini.coba} percobaan, {r.ai.gemini.ok} berhasil
                <br />
                OpenRouter: {r.ai.openrouter.coba} percobaan, {r.ai.openrouter.ok} berhasil
              </p>
            </div>
            <div className="kartu">
              <h3>Tanya SmartGloves</h3>
              <p>
                {r.tanya.hariIni} panggilan AI dari batas {r.tanya.batas} hari ini
              </p>
            </div>
          </div>

          <section className="kartu" style={{ margin: "1rem 0" }}>
            <h2 style={{ marginTop: 0 }}>Kesiapan sistem</h2>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {Object.entries(r.env).map(([k, ok]) => (
                <li key={k} style={{ color: ok ? undefined : "#ff8a8a" }}>
                  {LABEL_ENV[k] ?? k}: {ok ? "siap" : "belum"}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
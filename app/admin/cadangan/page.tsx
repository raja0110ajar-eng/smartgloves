"use client";

import { useRef, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";

type Ringkas = {
  sign: { baru: number; timpa: number; lewati: number; kembar: number };
  halaman: { baru: number; timpa: number; lewati: number };
};
type Hasil = { simulasi: boolean; ringkas: Ringkas; galat: string[]; jumlahGalat: number };

const MAKS_BYTE = 4 * 1024 * 1024;

export default function Cadangan() {
  const { ready, isAdmin, api } = useAdmin();
  const [berkas, setBerkas] = useState<unknown>(null);
  const [nama, setNama] = useState("");
  const [mode, setMode] = useState<"lewati" | "timpa">("lewati");
  const [periksa, setPeriksa] = useState<Hasil | null>(null);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  async function jalankan(aksi: () => Promise<void>) {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      await aksi();
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  function unduh() {
    return jalankan(async () => {
      const d = await api("/api/admin/ekspor");
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smartgloves-cadangan-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setPesan(`Cadangan diunduh: ${d.signs.length} kata dan ${d.halaman.length} halaman.`);
    });
  }

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setPeriksa(null);
    if (!f) return;
    if (f.size > MAKS_BYTE) {
      setPesan("File terlalu besar (maksimal 4 MB).");
      return;
    }
    try {
      setBerkas(JSON.parse(await f.text()));
      setNama(f.name);
      setPesan("File dibaca. Klik Periksa untuk melihat apa yang akan terjadi.");
    } catch {
      setBerkas(null);
      setNama("");
      setPesan("File bukan JSON yang valid.");
    }
  }

  function kirimImpor(simulasi: boolean) {
    return jalankan(async () => {
      const d: Hasil = await api("/api/admin/impor", "POST", { berkas, mode, simulasi });
      if (simulasi) {
        setPeriksa(d);
        setPesan("Pemeriksaan selesai. Belum ada yang diubah.");
      } else {
        setPeriksa(null);
        setBerkas(null);
        setNama("");
        setPesan("Impor selesai dan ruleset diperbarui.");
      }
    });
  }

  function terapkan() {
    const peringatan =
      mode === "timpa"
        ? "Data yang ID-nya sama akan DITIMPA oleh isi berkas. Lanjutkan?"
        : "Data baru akan ditambahkan, yang sudah ada dilewati. Lanjutkan?";
    if (confirm(peringatan)) kirimImpor(false);
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Cadangan data</h1>
      <p style={{ color: "var(--redup)" }}>
        Cadangan berisi kata, rule, dan halaman. File audio, event, log, dan akun login tidak ikut
        (audio hanya tersimpan alamatnya). Unduh cadangan sebelum perubahan besar.
      </p>
      {pesan && <p>{pesan}</p>}

      <section className="kartu" style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Unduh cadangan</h2>
        <div>
          <button onClick={unduh} disabled={sibuk}>
            {sibuk ? "Memproses..." : "Unduh cadangan (.json)"}
          </button>
        </div>
      </section>

      <section className="kartu" style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Pulihkan dari cadangan</h2>
        <input type="file" accept="application/json,.json" onChange={pilihFile} disabled={sibuk} />
        {nama && <div style={{ color: "var(--redup)" }}>File: {nama}</div>}

        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="radio"
            checked={mode === "lewati"}
            onChange={() => {
              setMode("lewati");
              setPeriksa(null);
            }}
          />
          Tambahkan yang baru saja (yang sudah ada dilewati, lebih aman)
        </label>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="radio"
            checked={mode === "timpa"}
            onChange={() => {
              setMode("timpa");
              setPeriksa(null);
            }}
          />
          Timpa yang ID-nya sama
        </label>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => kirimImpor(true)} disabled={sibuk || !berkas}>
            Periksa dulu
          </button>
          <button onClick={terapkan} disabled={sibuk || !periksa}>
            Terapkan impor
          </button>
        </div>

        {periksa && (
          <div>
            <strong>Hasil pemeriksaan</strong>
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
              <li>
                Kata: {periksa.ringkas.sign.baru} baru, {periksa.ringkas.sign.timpa} ditimpa,{" "}
                {periksa.ringkas.sign.lewati} dilewati, {periksa.ringkas.sign.kembar} dibuang
                karena teksnya kembar
              </li>
              <li>
                Halaman: {periksa.ringkas.halaman.baru} baru, {periksa.ringkas.halaman.timpa}{" "}
                ditimpa, {periksa.ringkas.halaman.lewati} dilewati
              </li>
              {periksa.jumlahGalat > 0 && (
                <li style={{ color: "#ff8a8a" }}>
                  {periksa.jumlahGalat} entri tidak valid dan akan diabaikan:
                  <ul>
                    {periksa.galat.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
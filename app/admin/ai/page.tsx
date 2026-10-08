"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/useAdmin";

type Draf = { nama_isyarat: string; teks_output: string; pilih: boolean };

export default function AiPage() {
  const { ready, isAdmin, api } = useAdmin();
  const [perintah, setPerintah] = useState("");
  const [draf, setDraf] = useState<Draf[]>([]);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  async function buatDraf() {
    setSibuk(true);
    setPesan("");
    try {
      const d = await api("/api/admin/ai", "POST", { perintah });
      setDraf(
        d.kata.map((k: { nama_isyarat: string; teks_output: string }) => ({
          ...k,
          pilih: true,
        }))
      );
      if (d.dilewati.length) {
        setPesan(`Dilewati karena sudah ada: ${d.dilewati.join(", ")}`);
      } else if (d.kata.length) {
        setPesan("Periksa draf di bawah, edit kalau perlu.");
      } else {
        setPesan("AI tidak menemukan kata baru.");
      }
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      setSibuk(false);
    }
  }

  function ubah(i: number, patch: Partial<Draf>) {
    setDraf(draf.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  async function simpan() {
    const sisa: Draf[] = [];
    let ok = 0;
    for (const k of draf) {
      if (!k.pilih) {
        sisa.push(k);
        continue;
      }
      try {
        await api("/api/admin/signs", "POST", {
          nama_isyarat: k.nama_isyarat,
          teks_output: k.teks_output,
        });
        ok++;
      } catch {
        sisa.push(k);
      }
    }
    setDraf(sisa);
    setPesan(`${ok} kata disimpan.${sisa.length ? " Sisanya belum tersimpan." : ""}`);
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui", padding: "0 1rem" }}>
      <p><a href="/admin">← Kembali</a></p>
      <h1>Asisten AI</h1>
      <p>Tulis kata apa yang mau didaftarkan, boleh banyak sekaligus.</p>

      <textarea
        rows={3}
        style={{ width: "100%" }}
        placeholder='Contoh: daftarkan kata halo, terima kasih, tolong, maaf'
        value={perintah}
        onChange={(e) => setPerintah(e.target.value)}
      />
      <button onClick={buatDraf} disabled={sibuk || perintah.trim().length < 2}>
        {sibuk ? "Memproses..." : "Buat draf"}
      </button>

      {pesan && <p>{pesan}</p>}

      {draf.length > 0 && (
        <>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
            {draf.map((k, i) => (
              <li key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={k.pilih}
                  onChange={(e) => ubah(i, { pilih: e.target.checked })}
                />
                <input
                  value={k.nama_isyarat}
                  onChange={(e) => ubah(i, { nama_isyarat: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  value={k.teks_output}
                  onChange={(e) => ubah(i, { teks_output: e.target.value })}
                  style={{ flex: 2 }}
                />
              </li>
            ))}
          </ul>
          <button onClick={simpan}>Simpan yang dicentang</button>
        </>
      )}
    </main>
  );
}
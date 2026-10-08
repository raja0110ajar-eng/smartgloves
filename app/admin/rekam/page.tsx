"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";
import { hitungKondisi } from "@/lib/pose";
import { SENSOR_KEYS, type Sample } from "@/lib/schema";

type Sign = { id: string; nama_isyarat: string; teks_output: string; aktif: boolean };

// Data contoh untuk mengetes tanpa sarung tangan: satu pose dengan sedikit "goyangan"
function buatContoh(): Sample[] {
  const dasar = { IBU_JARI: 8, TELUNJUK: 80, TENGAH: 78, MANIS: 82, KELINGKING: 79, PITCH: 5, ROLL: 0 };
  return Array.from({ length: 30 }, () => {
    const s = { ...dasar };
    for (const k of SENSOR_KEYS) {
      const goyang = k === "PITCH" || k === "ROLL" ? 3 : 2;
      s[k] = dasar[k] + (Math.random() * 2 - 1) * goyang;
    }
    return s;
  });
}

export default function RekamPage() {
  const { ready, isAdmin, api } = useAdmin();
  const [signs, setSigns] = useState<Sign[]>([]);
  const [signId, setSignId] = useState("");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [dipakai, setDipakai] = useState<Record<string, boolean>>(
    Object.fromEntries(SENSOR_KEYS.map((k) => [k, true]))
  );
  const [durasi, setDurasi] = useState(400);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    api("/api/admin/signs")
      .then((d) => setSigns(d.signs.filter((s: Sign) => s.aktif)))
      .catch((e) => setPesan(e.message));
  }, [isAdmin, api]);

  const kondisi = useMemo(
    () => (samples.length ? hitungKondisi(samples).filter((c) => dipakai[c.sensor]) : []),
    [samples, dipakai]
  );

  async function ambilRekaman() {
    try {
      const d = await api("/api/admin/record");
      setSamples(d.samples);
      setPesan(d.samples.length ? `${d.samples.length} sampel dimuat.` : "Belum ada rekaman dari sarung tangan.");
    } catch (e) {
      setPesan((e as Error).message);
    }
  }

  async function simpan() {
    try {
      const d = await api("/api/admin/rules", "POST", {
        sign_id: signId,
        durasi_tahan_ms: durasi,
        kondisi,
      });
      setPesan(
        `Tersimpan. Versi ruleset: ${d.versi}.` +
          (d.bentrok.length ? ` PERINGATAN: mirip dengan "${d.bentrok.join('", "')}". Perkecil toleransi atau rekam ulang.` : "")
      );
    } catch (e) {
      setPesan((e as Error).message);
    }
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui", padding: "0 1rem" }}>
      <p><a href="/admin">← Kembali</a></p>
      <h1>Mode Rekam</h1>

      <p>1. Pilih kata:</p>
      <select value={signId} onChange={(e) => setSignId(e.target.value)}>
        <option value="">-- pilih --</option>
        {signs.map((s) => (
          <option key={s.id} value={s.id}>{s.nama_isyarat}</option>
        ))}
      </select>

      <p>2. Ambil data pose:</p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={ambilRekaman}>Ambil dari sarung tangan</button>
        <button onClick={() => setSamples(buatContoh())}>Isi data contoh</button>
      </div>

      {kondisi.length > 0 && (
        <>
          <p>3. Batas yang dihitung ({samples.length} sampel). Hilangkan centang sensor yang tidak penting untuk kata ini:</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {hitungKondisi(samples).map((c) => (
              <li key={c.sensor}>
                <label>
                  <input
                    type="checkbox"
                    checked={dipakai[c.sensor]}
                    onChange={(e) => setDipakai({ ...dipakai, [c.sensor]: e.target.checked })}
                  />{" "}
                  {c.sensor}: {c.min} sampai {c.max}
                </label>
              </li>
            ))}
          </ul>

          <p>
            Pose ditahan{" "}
            <input
              type="number"
              value={durasi}
              min={100}
              max={3000}
              step={50}
              onChange={(e) => setDurasi(Number(e.target.value))}
              style={{ width: 80 }}
            />{" "}
            ms agar dianggap valid.
          </p>

          <button onClick={simpan} disabled={!signId || kondisi.length === 0}>
            Simpan sebagai rule
          </button>
        </>
      )}

      {pesan && <p>{pesan}</p>}
    </main>
  );
}
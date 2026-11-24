"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";
import { hitungKondisi, LABEL_TANGAN, type JenisTangan } from "@/lib/pose";
import {
  LABEL_SENSOR_DASAR,
  SENSOR_DASAR,
  sensorKey,
  type Sample,
  type SensorDasar,
  type Tangan,
} from "@/lib/schema";
import { BAHASA, type Bahasa } from "@/lib/bahasa";

type Sign = {
  id: string;
  nama_isyarat: string;
  teks_output: string;
  bahasa: Bahasa;
  tangan: JenisTangan | null;
  aktif: boolean;
};

const DASAR_KANAN: Record<SensorDasar, number> = {
  IBU_JARI: 8, TELUNJUK: 80, TENGAH: 78, MANIS: 82, KELINGKING: 79, PITCH: 5, ROLL: 0,
};
const DASAR_KIRI: Record<SensorDasar, number> = {
  IBU_JARI: 60, TELUNJUK: 15, TENGAH: 18, MANIS: 20, KELINGKING: 25, PITCH: -10, ROLL: 12,
};

// Data contoh untuk mengetes tanpa sarung tangan
function buatContoh(dua: boolean): Sample[] {
  return Array.from({ length: 30 }, () => {
    const s: Sample = {};
    for (const d of SENSOR_DASAR) {
      const goyang = d === "PITCH" || d === "ROLL" ? 3 : 2;
      s[sensorKey("R", d)] = DASAR_KANAN[d] + (Math.random() * 2 - 1) * goyang;
      if (dua) s[sensorKey("L", d)] = DASAR_KIRI[d] + (Math.random() * 2 - 1) * goyang;
    }
    return s;
  });
}

const punyaTangan = (samples: Sample[], t: Tangan) =>
  samples.length > 0 &&
  samples.every((s) => SENSOR_DASAR.every((d) => typeof s[sensorKey(t, d)] === "number"));

export default function RekamPage() {
  const { ready, isAdmin, api } = useAdmin();
  const [signs, setSigns] = useState<Sign[]>([]);
  const [bahasa, setBahasa] = useState<Bahasa | "semua">("semua");
  const [signId, setSignId] = useState("");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [tangan, setTangan] = useState<Record<Tangan, boolean>>({ R: true, L: false });
  const [dipakai, setDipakai] = useState<Record<string, boolean>>({});
  const [durasi, setDurasi] = useState(400);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    api("/api/admin/signs")
      .then((d) => setSigns((d.signs as Sign[]).filter((s) => s.aktif)))
      .catch((e) => setPesan(e.message));
  }, [isAdmin, api]);

  const terpilih = signs.find((s) => s.id === signId);
  const adaKanan = useMemo(() => punyaTangan(samples, "R"), [samples]);
  const adaKiri = useMemo(() => punyaTangan(samples, "L"), [samples]);

  // Tangan yang dipakai dipilih otomatis (bisa diubah): SIBI umumnya tangan kanan saja,
  // BISINDO banyak yang memakai dua tangan.
  useEffect(() => {
    const dua = terpilih?.tangan === "dua" || terpilih?.bahasa === "BISINDO";
    setTangan({
      R: adaKanan && terpilih?.tangan !== "kiri",
      L: adaKiri && (dua || terpilih?.tangan === "kiri"),
    });
    setDipakai({});
  }, [terpilih, adaKanan, adaKiri]);

  const semua = useMemo(() => hitungKondisi(samples), [samples]);
  const kondisi = semua.filter(
    (c) => tangan[c.sensor[0] as Tangan] && dipakai[c.sensor] !== false
  );

  async function ambilRekaman() {
    try {
      const d = await api("/api/admin/record");
      setSamples(d.samples);
      setPesan(
        d.samples.length
          ? `${d.samples.length} sampel dimuat.`
          : "Belum ada rekaman dari sarung tangan."
      );
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
        `Tersimpan untuk ${d.bahasa}. Versi ruleset: ${d.versi}.` +
          (d.bentrok.length
            ? ` PERINGATAN: mirip dengan "${d.bentrok.join('", "')}" di ${d.bahasa}. Perkecil toleransi atau rekam ulang.`
            : "")
      );
    } catch (e) {
      setPesan((e as Error).message);
    }
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  const daftarKata = signs.filter((s) => bahasa === "semua" || s.bahasa === bahasa);

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Mode Rekam</h1>

      <p>1. Pilih bahasa dan kata:</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <select value={bahasa} onChange={(e) => setBahasa(e.target.value as Bahasa | "semua")}>
          <option value="semua">Semua bahasa</option>
          {BAHASA.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={signId} onChange={(e) => setSignId(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
          <option value="">-- pilih kata --</option>
          {daftarKata.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama_isyarat} ({s.bahasa})
            </option>
          ))}
        </select>
      </div>

      <p>2. Ambil data pose:</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={ambilRekaman}>Ambil dari sarung tangan</button>
        <button onClick={() => setSamples(buatContoh(false))}>Contoh: satu tangan</button>
        <button onClick={() => setSamples(buatContoh(true))}>Contoh: dua tangan</button>
      </div>

      {samples.length > 0 && (
        <p className="catatan" style={{ maxWidth: "none", marginTop: "0.75rem" }}>
          {samples.length} sampel. Data tangan kanan: {adaKanan ? "ada" : "tidak ada"}. Data tangan
          kiri: {adaKiri ? "ada" : "tidak ada (tangan kiri tidak terhubung saat merekam?)"}.
        </p>
      )}

      {semua.length > 0 && (
        <>
          <p>3. Pilih tangan dan sensor yang menjadi syarat isyarat ini:</p>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {(["R", "L"] as const).map((t) => {
              const daftar = semua.filter((c) => c.sensor.startsWith(`${t}_`));
              if (daftar.length === 0) return null;
              return (
                <section key={t} className="kartu" style={{ display: "grid", gap: "0.4rem" }}>
                  <strong>{t === "R" ? "Tangan kanan (master)" : "Tangan kiri (slave)"}</strong>
                  <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={tangan[t]}
                      onChange={(e) => setTangan({ ...tangan, [t]: e.target.checked })}
                    />
                    Pakai tangan ini sebagai syarat isyarat
                  </label>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {daftar.map((c) => (
                      <li key={c.sensor}>
                        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            disabled={!tangan[t]}
                            checked={tangan[t] && dipakai[c.sensor] !== false}
                            onChange={(e) => setDipakai({ ...dipakai, [c.sensor]: e.target.checked })}
                          />
                          {LABEL_SENSOR_DASAR[c.sensor.slice(2) as SensorDasar]}: {c.min} sampai {c.max}
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <p className="catatan" style={{ maxWidth: "none" }}>
            Isyarat satu tangan sebaiknya hanya memakai satu tangan. Kalau tangan lain ikut dicentang,
            isyarat baru dikenali saat tangan itu juga berada di pose yang direkam.
          </p>

          <p>
            Pose ditahan{" "}
            <input
              type="number"
              value={durasi}
              min={100}
              max={3000}
              step={50}
              onChange={(e) => setDurasi(Number(e.target.value))}
              style={{ width: 90 }}
            />{" "}
            ms agar dianggap valid.
          </p>

          <button onClick={simpan} disabled={!signId || kondisi.length === 0}>
            Simpan sebagai rule
          </button>
          {terpilih && (
            <span className="catatan" style={{ marginLeft: "0.75rem" }}>
              {terpilih.bahasa}
              {terpilih.tangan ? `, saat ini: ${LABEL_TANGAN[terpilih.tangan].toLowerCase()}` : ""}
            </span>
          )}
        </>
      )}

      {pesan && <p>{pesan}</p>}
    </main>
  );
}
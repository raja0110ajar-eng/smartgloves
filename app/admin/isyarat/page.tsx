"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebaseClient";
import { useAdmin } from "@/lib/useAdmin";
import { BAHASA, type Bahasa } from "@/lib/bahasa";
import { KATEGORI, LABEL_KATEGORI, type Kategori } from "@/lib/kategori";
import { hitungKondisi, type Kondisi } from "@/lib/pose";
import {
  LABEL_SENSOR_DASAR,
  SENSOR_DASAR,
  sensorKey,
  type Sample,
  type SensorDasar,
  type Tangan,
} from "@/lib/schema";
import { pcmKeMp3, ubahKeMp3 } from "@/lib/audioBrowser";

type Info = {
  id: string;
  nama_isyarat: string;
  teks_output: string;
  bahasa: Bahasa;
  tangan: "kanan" | "kiri" | "dua" | null;
  aktif: boolean;
  audio_url: string;
  punya_rule: boolean;
  kondisi: Kondisi[];
  durasi_tahan_ms: number;
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

function base64KePcm(b64: string): Int16Array {
  const bin = atob(b64);
  const n = bin.length - (bin.length % 2);
  const bytes = new Uint8Array(n);
  for (let i = 0; i < n; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

const tunda = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function IsyaratBaru() {
  const { ready, isAdmin, api } = useAdmin();
  const [id, setId] = useState("");
  const [sign, setSign] = useState<Info | null>(null);

  // Langkah 1
  const [bahasa, setBahasa] = useState<Bahasa>("SIBI");
  const [nama, setNama] = useState("");
  const [teks, setTeks] = useState("");
  const [kategori, setKategori] = useState<Kategori>("kata");

  // Langkah 2
  const [samples, setSamples] = useState<Sample[]>([]);
  const [faktor, setFaktor] = useState(1);
  const [tangan, setTangan] = useState<Record<Tangan, boolean>>({ R: true, L: false });
  const [dipakai, setDipakai] = useState<Record<string, boolean>>({});
  const [ubah, setUbah] = useState<Record<string, { min: number; max: number }>>({});
  const [durasi, setDurasi] = useState(400);
  const [tunggu, setTunggu] = useState(false);
  const [simpanan, setSimpanan] = useState<{ versi: number; bentrok: string[] } | null>(null);

  // Langkah 3
const [kecepatanSuara, setKecepatanSuara] = useState("+20%");
const [audio, setAudio] = useState<{ blob: Blob; url: string; detik: number } | null>(null);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muatSign = useCallback(
    async (target: string) => {
      const d = await api("/api/admin/signs");
      const s = (d.signs as Info[]).find((x) => x.id === target);
      if (!s) throw new Error("Isyarat tidak ditemukan.");
      setSign(s);
      setDurasi(s.durasi_tahan_ms || 400);
    },
    [api]
  );

  useEffect(() => {
    if (!isAdmin) return;
    const q = new URLSearchParams(window.location.search).get("id");
    if (q) {
      setId(q);
      muatSign(q).catch((e) => setPesan(e.message));
    }
  }, [isAdmin, muatSign]);

  async function jalankan(aksi: () => Promise<string | void>) {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      const hasil = await aksi();
      if (hasil) setPesan(hasil);
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  const bahasaSign: Bahasa = sign?.bahasa ?? bahasa;
  const dasarKond: Kondisi[] = useMemo(
    () => (samples.length ? hitungKondisi(samples, faktor) : (sign?.kondisi ?? [])),
    [samples, faktor, sign]
  );
  const adaKanan = dasarKond.some((c) => c.sensor.startsWith("R_"));
  const adaKiri = dasarKond.some((c) => c.sensor.startsWith("L_"));
  

  // Tangan yang dipakai dipilih otomatis (bisa diubah): SIBI umumnya satu tangan,
  // BISINDO banyak yang dua tangan.
  useEffect(() => {
    const dua = bahasaSign === "BISINDO" || sign?.tangan === "dua" || sign?.tangan === "kiri";
    setTangan({ R: adaKanan && sign?.tangan !== "kiri", L: adaKiri && (dua || !adaKanan) });
  }, [adaKanan, adaKiri, bahasaSign, sign?.tangan]);

  const akhir: Kondisi[] = dasarKond
    .filter((c) => tangan[c.sensor[0] as Tangan] && dipakai[c.sensor] !== false)
    .map((c) => (ubah[c.sensor] ? { sensor: c.sensor, ...ubah[c.sensor] } : c));
  const rentangSalah = akhir.some((c) => !(c.min <= c.max));

  function sampelBaru(s: Sample[]) {
    setSamples(s);
    setUbah({});
    setDipakai({});
    setSimpanan(null);
  }

  function buatIsyarat(e: React.FormEvent) {
    e.preventDefault();
    return jalankan(async () => {
      const d = await api("/api/admin/signs", "POST", {
        nama_isyarat: nama,
        teks_output: teks,
        kategori,
        bahasa,
      });
      setId(d.id);
      await muatSign(d.id);
      window.history.replaceState(null, "", `/admin/isyarat?id=${encodeURIComponent(d.id)}`);
      return `Isyarat dibuat di ${bahasa}. Lanjut ke langkah 2.`;
    });
  }

  function ambilRekaman() {
    return jalankan(async () => {
      const d = await api("/api/admin/record");
      sampelBaru(d.samples);
      return d.samples.length
        ? `${d.samples.length} sampel dimuat.`
        : "Belum ada rekaman dari sarung tangan.";
    });
  }

  async function tungguRekaman() {
    if (tunggu || kunci.current) return;
    setTunggu(true);
    try {
      const awal = await api("/api/admin/record");
      const w0: number = awal.waktu ?? 0;
      setPesan("Menunggu rekaman baru... Tahan tombol BOOT di sarung tangan sekitar 3 detik sambil menahan pose (maksimal 60 detik).");
      for (let i = 0; i < 30; i++) {
        await tunda(2000);
        const d = await api("/api/admin/record");
        if ((d.waktu ?? 0) !== w0 && d.samples.length) {
          sampelBaru(d.samples);
          setPesan(`Rekaman baru diterima: ${d.samples.length} sampel.`);
          return;
        }
      }
      setPesan("Tidak ada rekaman baru dalam 60 detik. Pastikan sarung tangan online lalu coba lagi.");
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      setTunggu(false);
    }
  }

  function simpanRule() {
    return jalankan(async () => {
      const d = await api("/api/admin/rules", "POST", {
        sign_id: id,
        durasi_tahan_ms: durasi,
        kondisi: akhir,
      });
      setSimpanan({ versi: d.versi, bentrok: d.bentrok });
      await muatSign(id);
      return `Rule tersimpan untuk ${d.bahasa}. Versi ruleset: ${d.versi}. Sarung tangan akan mengunduhnya dalam sekitar satu menit.`;
    });
  }

  function simpanAudioPratinjau(blob: Blob, detik: number) {
    setAudio((lama) => {
      if (lama) URL.revokeObjectURL(lama.url);
      return { blob, url: URL.createObjectURL(blob), detik };
    });
  }

function buatSuara() {
  return jalankan(async () => {
    setPesan("Membuat suara...");
    const ucap = (sign?.teks_output ?? teks).trim();
    const d = await api("/api/admin/tts", "POST", {
      teks: ucap,
      kecepatan: kecepatanSuara,
    });
    const { blob, detik } = await pcmKeMp3(base64KePcm(d.pcm), d.rate);
    simpanAudioPratinjau(blob, detik);
    return "Suara jadi. Dengarkan dulu, lalu unggah.";
  });
}

  function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    return jalankan(async () => {
      const { blob, detik } = await ubahKeMp3(f);
      simpanAudioPratinjau(blob, detik);
      return "File dikonversi. Dengarkan dulu, lalu unggah.";
    });
  }

  function unggahAudio() {
    if (!audio) return;
    return jalankan(async () => {
      const token = await auth.currentUser?.getIdToken();
      const fd = new FormData();
      fd.append("sign_id", id);
      fd.append("file", audio.blob, "audio.mp3");
      let res: Response;
      try {
        res = await fetch("/api/admin/audio", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      } catch {
        throw new Error("Koneksi bermasalah. Periksa sinyal lalu coba lagi.");
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Gagal (HTTP ${res.status})`);
      setAudio(null);
      await muatSign(id);
      return "Suara tersimpan. Sarung tangan akan mengunduhnya setelah ruleset diperbarui.";
    });
  }

  function simulasi() {
    return jalankan(async () => {
      await api("/api/admin/simulate", "POST", { sign_id: id });
      return "Terkirim ke Demo Live. Buka /live untuk melihatnya.";
    });
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  const punyaRule = !!sign?.punya_rule;
  const punyaAudio = !!sign?.audio_url;

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>{id ? "Atur isyarat" : "Isyarat baru"}</h1>
      <p style={{ color: "var(--redup)" }}>
        Semua dilakukan di sini: buat isyarat, ambil pose dari sarung tangan, atur rentang, buat
        suara, lalu uji. Tidak perlu terminal atau VS Code.
      </p>
      {pesan && <p>{pesan}</p>}

      {sign && (
        <p className="catatan" style={{ maxWidth: "none" }}>
          <strong>{sign.nama_isyarat}</strong> ({sign.bahasa}). Isyarat dibuat: ya. Rule:{" "}
          {punyaRule ? "ada" : "belum"}. Suara: {punyaAudio ? "ada" : "belum"}.
        </p>
      )}

      {/* ---------- Langkah 1 ---------- */}
      {!id && (
        <section className="kartu" style={{ display: "grid", gap: "0.6rem", margin: "1rem 0" }}>
          <h2 style={{ margin: 0 }}>1. Isyarat</h2>
          <form onSubmit={buatIsyarat} style={{ display: "grid", gap: "0.5rem" }}>
            <select value={bahasa} onChange={(e) => setBahasa(e.target.value as Bahasa)}>
              {BAHASA.map((b) => (
                <option key={b} value={b}>
                  Bahasa isyarat: {b}
                </option>
              ))}
            </select>
            <input placeholder="Nama isyarat (mis. Halo)" value={nama} onChange={(e) => setNama(e.target.value)} required />
            <input placeholder="Teks yang tampil dan diucapkan (mis. Halo)" value={teks} onChange={(e) => setTeks(e.target.value)} required />
            <select value={kategori} onChange={(e) => setKategori(e.target.value as Kategori)}>
              {KATEGORI.map((k) => (
                <option key={k} value={k}>
                  Kategori: {LABEL_KATEGORI[k]}
                </option>
              ))}
            </select>
            <div>
              <button type="submit" disabled={sibuk}>
                Buat isyarat
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ---------- Langkah 2 ---------- */}
      {id && (
        <section className="kartu" style={{ display: "grid", gap: "0.75rem", margin: "1rem 0" }}>
          <h2 style={{ margin: 0 }}>2. Pose</h2>
          <p className="catatan" style={{ maxWidth: "none" }}>
            Tahan pose isyarat di sarung tangan, lalu ambil rekamannya.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={tungguRekaman} disabled={sibuk || tunggu}>
              {tunggu ? "Menunggu rekaman..." : "Tunggu rekaman baru dari sarung tangan"}
            </button>
            <button onClick={ambilRekaman} disabled={sibuk || tunggu}>
              Ambil rekaman terakhir
            </button>
            <button onClick={() => sampelBaru(buatContoh(false))} disabled={sibuk || tunggu}>
              Contoh: satu tangan
            </button>
            <button onClick={() => sampelBaru(buatContoh(true))} disabled={sibuk || tunggu}>
              Contoh: dua tangan
            </button>
          </div>

          {dasarKond.length > 0 && (
            <>
              <label style={{ display: "grid", gap: "0.25rem" }}>
                <span>
                  Toleransi: <strong>{faktor.toFixed(1)}x</strong>{" "}
                  <span className="catatan">(kecil = ketat, besar = longgar)</span>
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  value={faktor}
                  disabled={samples.length === 0}
                  onChange={(e) => {
                    setFaktor(Number(e.target.value));
                    setUbah({});
                  }}
                />
              </label>
              {samples.length === 0 && (
                <p className="catatan" style={{ maxWidth: "none" }}>
                  Menampilkan rule yang sudah tersimpan. Ambil rekaman baru kalau mau menghitung ulang.
                </p>
              )}

              {(["R", "L"] as const).map((t) => {
                const daftar = dasarKond.filter((c) => c.sensor.startsWith(`${t}_`));
                if (daftar.length === 0) return null;
                return (
                  <div key={t} style={{ display: "grid", gap: "0.35rem" }}>
                    <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={tangan[t]}
                        onChange={(e) => setTangan({ ...tangan, [t]: e.target.checked })}
                      />
                      <strong>{t === "R" ? "Tangan kanan (master)" : "Tangan kiri (slave)"}</strong>
                    </label>
                    {daftar.map((c) => {
                      const nilai = ubah[c.sensor] ?? c;
                      return (
                        <div key={c.sensor} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", opacity: tangan[t] ? 1 : 0.45 }}>
                          <input
                            type="checkbox"
                            disabled={!tangan[t]}
                            checked={dipakai[c.sensor] !== false}
                            onChange={(e) => setDipakai({ ...dipakai, [c.sensor]: e.target.checked })}
                            aria-label={`Pakai ${c.sensor}`}
                          />
                          <span style={{ minWidth: 190 }}>{LABEL_SENSOR_DASAR[c.sensor.slice(2) as SensorDasar]}</span>
                          <input
                            type="number"
                            disabled={!tangan[t]}
                            style={{ width: 90 }}
                            value={nilai.min}
                            onChange={(e) => setUbah({ ...ubah, [c.sensor]: { min: Number(e.target.value), max: nilai.max } })}
                            aria-label={`Minimum ${c.sensor}`}
                          />
                          <span>sampai</span>
                          <input
                            type="number"
                            disabled={!tangan[t]}
                            style={{ width: 90 }}
                            value={nilai.max}
                            onChange={(e) => setUbah({ ...ubah, [c.sensor]: { min: nilai.min, max: Number(e.target.value) } })}
                            aria-label={`Maksimum ${c.sensor}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <p className="catatan" style={{ maxWidth: "none" }}>
                Isyarat satu tangan sebaiknya hanya memakai satu tangan. Kalau tangan lain ikut
                dicentang, isyarat baru dikenali saat tangan itu juga berada di pose yang direkam.
              </p>

              <label>
                Pose ditahan{" "}
                <input type="number" min={100} max={3000} step={50} style={{ width: 90 }} value={durasi} onChange={(e) => setDurasi(Number(e.target.value))} />{" "}
                ms agar dianggap valid.
              </label>

              {rentangSalah && (
                <p style={{ color: "#ff8a8a", margin: 0 }}>Ada rentang yang minimumnya lebih besar dari maksimumnya.</p>
              )}
              <div>
                <button onClick={simpanRule} disabled={sibuk || akhir.length === 0 || rentangSalah}>
                  Simpan rule ({akhir.length} syarat)
                </button>
              </div>
              {simpanan && simpanan.bentrok.length > 0 && (
                <p style={{ color: "#ffb84d", margin: 0 }}>
                  PERINGATAN: mirip dengan &quot;{simpanan.bentrok.join('", "')}&quot; di {bahasaSign}. Perkecil
                  toleransi atau rekam ulang, lalu simpan lagi.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {/* ---------- Langkah 3 ---------- */}
      {id && (
        <section className="kartu" style={{ display: "grid", gap: "0.6rem", margin: "1rem 0" }}>
          <h2 style={{ margin: 0 }}>3. Suara</h2>
          <p className="catatan" style={{ maxWidth: "none" }}>
            Buat suara otomatis, atau unggah file suara sendiri. Hasilnya dikonversi ke MP3 kecil
            (mono 16 kHz) di browser. Untuk merekam lewat mikrofon, pakai halaman Audio.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={buatSuara} disabled={sibuk}>
              Buat suara otomatis (AI)
            </button>
            <input type="file" accept="audio/*" onChange={pilihFile} disabled={sibuk} />
          </div>
            <select
            value={kecepatanSuara}
            onChange={(e) => setKecepatanSuara(e.target.value)}
            disabled={sibuk}
            className="rounded-lg border px-3 py-2 text-sm"
            >
            <option value="+35%">Sangat Cepat (Gerak Kilat)</option>
            <option value="+20%">Cepat & Tegas</option>
            <option value="+0%">Alami</option>
            <option value="-10%">Sedang</option>
            <option value="-20%">Pelan (Gerak Lambat)</option>
            </select>
          {audio && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div>
                Hasil: {audio.detik.toFixed(1)} detik, {(audio.blob.size / 1024).toFixed(1)} KB
              </div>
              <audio controls src={audio.url} style={{ width: "100%" }} />
              <div>
                <button onClick={unggahAudio} disabled={sibuk}>
                  Unggah sebagai suara isyarat ini
                </button>
              </div>
            </div>
          )}
          {sign?.audio_url && !audio && (
            <div>
              Suara saat ini: <button onClick={() => new Audio(sign.audio_url).play()}>Putar</button>
            </div>
          )}
        </section>
      )}

      {/* ---------- Langkah 4 ---------- */}
      {id && (
        <section className="kartu" style={{ display: "grid", gap: "0.6rem", margin: "1rem 0" }}>
          <h2 style={{ margin: 0 }}>4. Uji</h2>
          <p className="catatan" style={{ maxWidth: "none" }}>
            Sarung tangan memeriksa ruleset sekitar tiap satu menit (atau ketik ruleset di Serial
            Monitor untuk memaksanya), lalu mengunduh rule dan suara yang baru.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={simulasi} disabled={sibuk || !punyaRule}>
              Simulasikan di Demo Live
            </button>
            <a href="/live" target="_blank" rel="noreferrer">
              <button type="button">Buka Demo Live</button>
            </a>
            <a href="/admin/isyarat">
              <button type="button">Tambah isyarat lain</button>
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
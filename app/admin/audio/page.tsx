"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebaseClient";
import { useAdmin } from "@/lib/useAdmin";
import { ubahKeMp3 } from "@/lib/audioBrowser";

type Sign = {
  id: string;
  nama_isyarat: string;
  teks_output: string;
  aktif: boolean;
  audio_url: string;
};

type Hasil = { blob: Blob; url: string; detik: number };

const MAKS_REKAM_DETIK = 10;

export default function AudioAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [signs, setSigns] = useState<Sign[]>([]);
  const [signId, setSignId] = useState("");
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [merekam, setMerekam] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const muat = useCallback(async () => {
    const d = await api("/api/admin/signs");
    setSigns(d.signs);
  }, [api]);

  useEffect(() => {
    if (isAdmin) muat().catch((e) => setPesan(e.message));
  }, [isAdmin, muat]);

  function simpanHasil(blob: Blob, detik: number) {
    setHasil((lama) => {
      if (lama) URL.revokeObjectURL(lama.url);
      return { blob, url: URL.createObjectURL(blob), detik };
    });
  }

  async function proses(sumber: Blob) {
    setSibuk(true);
    setPesan("Mengonversi...");
    try {
      const { blob, detik } = await ubahKeMp3(sumber);
      simpanHasil(blob, detik);
      setPesan("Selesai dikonversi. Dengarkan dulu, lalu unggah.");
    } catch (e) {
      setHasil(null);
      setPesan((e as Error).message);
    } finally {
      setSibuk(false);
    }
  }

  function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) proses(f);
  }

  async function mulaiRekam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const potongan: BlobPart[] = [];
      mr.ondataavailable = (e) => potongan.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setMerekam(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        proses(new Blob(potongan, { type: mr.mimeType }));
      };
      mr.start();
      recRef.current = mr;
      setMerekam(true);
      setPesan(`Merekam... (otomatis berhenti setelah ${MAKS_REKAM_DETIK} detik)`);
      timerRef.current = setTimeout(() => {
        if (mr.state === "recording") mr.stop();
      }, MAKS_REKAM_DETIK * 1000);
    } catch {
      setPesan("Mikrofon tidak bisa diakses. Izinkan akses mikrofon di browser.");
    }
  }

  function berhentiRekam() {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }

  async function unggah() {
    if (!hasil || !signId || sibuk) return;
    setSibuk(true);
    setPesan("Mengunggah...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const fd = new FormData();
      fd.append("sign_id", signId);
      fd.append("file", hasil.blob, "audio.mp3");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Gagal (HTTP ${res.status})`);
      setPesan("Audio tersimpan untuk kata ini.");
      setHasil(null);
      await muat();
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      setSibuk(false);
    }
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  const terpilih = signs.find((s) => s.id === signId);

  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <a href="/admin">← Kembali</a>
      </p>
      <h1>Audio kata</h1>
      <p style={{ color: "var(--redup)" }}>
        Unggah file suara atau rekam langsung. Hasilnya otomatis dikonversi ke MP3 mono 16 kHz,
        sama seperti hasil skrip. Untuk suara mesin (Edge-TTS), tetap pakai skrip di laptop.
      </p>

      <p>1. Pilih kata:</p>
      <select
        value={signId}
        onChange={(e) => setSignId(e.target.value)}
        style={{ width: "100%" }}
      >
        <option value="">-- pilih --</option>
        {signs.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nama_isyarat} → {s.teks_output} {s.audio_url ? "(sudah ada audio)" : "(belum ada audio)"}
            {s.aktif ? "" : " [nonaktif]"}
          </option>
        ))}
      </select>

      {terpilih?.audio_url && (
        <p>
          Audio saat ini:{" "}
          <button onClick={() => new Audio(terpilih.audio_url).play()}>Putar</button>
        </p>
      )}

      <p>2. Masukkan suara:</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input type="file" accept="audio/*" onChange={pilihFile} disabled={sibuk || merekam} />
        {!merekam ? (
          <button onClick={mulaiRekam} disabled={sibuk}>
            Rekam dari mikrofon
          </button>
        ) : (
          <button onClick={berhentiRekam}>Berhenti merekam</button>
        )}
      </div>

      {pesan && <p>{pesan}</p>}

      {hasil && (
        <section className="kartu" style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <div>
            Hasil: {hasil.detik.toFixed(1)} detik, {(hasil.blob.size / 1024).toFixed(1)} KB
          </div>
          <audio controls src={hasil.url} style={{ width: "100%" }} />
          <button onClick={unggah} disabled={sibuk || !signId}>
            {sibuk ? "Memproses..." : signId ? "Unggah sebagai audio kata ini" : "Pilih kata dulu"}
          </button>
        </section>
      )}
    </main>
  );
}
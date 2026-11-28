"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";
import { kondisiPerangkat, teksDurasi } from "@/lib/statusBantu";
import { persenBaterai } from "@/lib/baterai";
import { LABEL_PERINTAH, statusEfektif, type AksiPerintah } from "@/lib/perintah";

type P = {
  id: string;
  detikLalu: number | null;
  fw: string;
  rssi: number | null;
  kiri: boolean | null;
  vk: number | null;
  vi: number | null;
  bhs: string;
};

type Riwayat = {
  id: string;
  aksi: string;
  param: string;
  status: string;
  pesan: string;
  oleh: string;
  dibuat: number;
  diambil: number;
};

const LABEL = { belum: "Belum pernah terhubung", online: "Online", putus: "Tidak terlihat" } as const;

export default function PerangkatAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [daftar, setDaftar] = useState<P[]>([]);
  const [pilih, setPilih] = useState("");
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [sesiSampai, setSesiSampai] = useState(0);
  const [sekarang, setSekarang] = useState(() => Date.now());
  const [bahasa, setBahasa] = useState<"SIBI" | "BISINDO">("SIBI");
  const [volume, setVolume] = useState(12);
  const [teksPutar, setTeksPutar] = useState("");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muatDaftar = useCallback(async () => {
    const d = await api("/api/admin/perangkat");
    setDaftar(d.perangkat);
    setPilih((lama) => {
      if (lama) return lama;
      const nyata = (d.perangkat as P[]).find((x) => x.id !== "simulator");
      return nyata?.id ?? "";
    });
  }, [api]);

  const muatRiwayat = useCallback(async () => {
    if (!pilih || pilih === "simulator") return;
    const d = await api(`/api/admin/perintah?device_id=${encodeURIComponent(pilih)}`);
    setRiwayat(d.riwayat);
    setSesiSampai(d.sesiSampai);
    setSekarang(Date.now());
  }, [api, pilih]);

  useEffect(() => {
    if (!isAdmin) return;
    muatDaftar().catch((e) => setPesan(e.message));
    const t = setInterval(() => {
      if (document.visibilityState === "visible") muatDaftar().catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [isAdmin, muatDaftar]);

  const adaMenunggu = riwayat.some((r) => r.status === "menunggu" || r.status === "dikirim");
  useEffect(() => {
    if (!isAdmin || !pilih || pilih === "simulator") return;
    muatRiwayat().catch(() => {});
    const t = setInterval(() => {
      if (document.visibilityState === "visible") muatRiwayat().catch(() => {});
    }, adaMenunggu ? 4000 : 20000);
    return () => clearInterval(t);
  }, [isAdmin, pilih, adaMenunggu, muatRiwayat]);

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

  function kirim(aksi: AksiPerintah, param?: string | number) {
    return jalankan(async () => {
      await api("/api/admin/perintah", "POST", { device_id: pilih, aksi, param: param ?? null });
      await muatRiwayat();
      return `${LABEL_PERINTAH[aksi]} dikirim. Sarung tangan mengambilnya dalam beberapa detik.`;
    });
  }

  function modeCepat() {
    return jalankan(async () => {
      await api("/api/admin/perintah", "PUT", { device_id: pilih });
      await muatRiwayat();
      return "Mode cepat aktif 3 menit: sarung tangan memeriksa server tiap 3 detik.";
    });
  }

  function batalkan(r: Riwayat) {
    return jalankan(async () => {
      await api("/api/admin/perintah", "DELETE", { device_id: pilih, id: r.id });
      await muatRiwayat();
      return "Perintah dibatalkan.";
    });
  }

  function simulasi(aksi: "hidup" | "putus") {
    return jalankan(async () => {
      await api("/api/admin/perangkat", "POST", { aksi });
      await muatDaftar();
      return aksi === "hidup" ? "Simulasi: perangkat hidup." : "Simulasi: perangkat putus.";
    });
  }

  function hapus(p: P) {
    if (!confirm(`Hapus catatan perangkat "${p.id}"?`)) return;
    return jalankan(async () => {
      await api("/api/admin/perangkat", "DELETE", { id: p.id });
      if (pilih === p.id) setPilih("");
      await muatDaftar();
      return "Catatan dihapus.";
    });
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  const dipilih = daftar.find((p) => p.id === pilih);
  const online = dipilih ? kondisiPerangkat(dipilih.detikLalu) === "online" : false;
  const cepat = sesiSampai > sekarang;

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Perangkat</h1>
      <p style={{ color: "var(--redup)" }}>
        Perangkat dianggap online kalau memeriksa server dalam 150 detik terakhir. Ini berarti ESP32 terhubung
        ke server, bukan berarti sarung tangan sedang dipakai.
      </p>
      {pesan && <p>{pesan}</p>}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={() => muatDaftar().catch((e) => setPesan(e.message))} disabled={sibuk}>
          Segarkan
        </button>
        <button onClick={() => simulasi("hidup")} disabled={sibuk}>
          Simulasikan perangkat hidup
        </button>
        <button onClick={() => simulasi("putus")} disabled={sibuk}>
          Simulasikan perangkat putus
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
        {daftar.length === 0 && <li style={{ color: "var(--redup)" }}>Belum ada perangkat yang tercatat.</li>}
        {daftar.map((p) => {
          const k = kondisiPerangkat(p.detikLalu);
          return (
            <li
              key={p.id}
              className="kartu"
              style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}
            >
              <span style={{ display: "grid", gap: "0.2rem" }}>
                <strong>{p.id}</strong>
                <span>
                  <span className={`titik ${k}`} aria-hidden="true" /> {LABEL[k]}
                  {p.detikLalu !== null && ` (${teksDurasi(p.detikLalu)})`}
                </span>
                <span style={{ color: "var(--redup)", fontSize: "0.85rem" }}>
                  Firmware: {p.fw || "-"} · Sinyal WiFi: {p.rssi === null ? "-" : `${p.rssi} dBm`}
                  <br />
                  Tangan kiri: {p.kiri === null ? "tidak dilaporkan" : p.kiri ? "terhubung" : "tidak terhubung"} ·
                  Baterai kanan: {p.vk === null ? "-" : `${p.vk} mV (${persenBaterai(p.vk) ?? "-"}%)`} · Baterai kiri:{" "}
                  {p.vi === null ? "-" : `${p.vi} mV (${persenBaterai(p.vi) ?? "-"}%)`} · Bahasa aktif: {p.bhs || "-"}
                </span>
              </span>
              <span style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                {p.id !== "simulator" && (
                  <button onClick={() => setPilih(p.id)} disabled={pilih === p.id}>
                    {pilih === p.id ? "Dipilih" : "Kendalikan"}
                  </button>
                )}
                <button onClick={() => hapus(p)} disabled={sibuk}>
                  Hapus
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      {dipilih && dipilih.id !== "simulator" && (
        <section className="kartu" style={{ display: "grid", gap: "0.9rem", margin: "1.5rem 0" }}>
          <h2 style={{ margin: 0 }}>Kendali: {dipilih.id}</h2>
          {!online && (
            <p style={{ margin: 0, color: "#ffb84d" }}>
              Perangkat tidak terlihat. Perintah akan menunggu sampai perangkat online lagi.
            </p>
          )}
          <p className="catatan" style={{ maxWidth: "none" }}>
            {cepat
              ? `Mode cepat aktif sampai ${new Date(sesiSampai).toLocaleTimeString("id-ID")} (sarung tangan memeriksa tiap 3 detik).`
              : "Mode normal: sarung tangan memeriksa tiap sekitar 60 detik. Mengirim perintah otomatis menyalakan mode cepat 3 menit."}{" "}
            <button onClick={modeCepat} disabled={sibuk}>
              Aktifkan mode cepat
            </button>
          </p>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <select value={bahasa} onChange={(e) => setBahasa(e.target.value as "SIBI" | "BISINDO")}>
              <option value="SIBI">SIBI</option>
              <option value="BISINDO">BISINDO</option>
            </select>
            <button onClick={() => kirim("bahasa", bahasa)} disabled={sibuk}>
              Ganti bahasa
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="range"
              min={0}
              max={21}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
            />
            <span>Volume {volume}</span>
            <button onClick={() => kirim("volume", volume)} disabled={sibuk}>
              Atur volume
            </button>
            <button onClick={() => kirim("bip")} disabled={sibuk}>
              Nada uji
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              placeholder="Teks kata untuk diputar (mis. Halo)"
              value={teksPutar}
              maxLength={60}
              onChange={(e) => setTeksPutar(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button onClick={() => kirim("putar", teksPutar)} disabled={sibuk || !teksPutar.trim()}>
              Putar suara
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={() => kirim("rekam")} disabled={sibuk}>
              Rekam pose (hitung mundur 3 dtk)
            </button>
            <button onClick={() => kirim("kalibrasi")} disabled={sibuk}>
              Kalibrasi sensor
            </button>
            <button onClick={() => kirim("sinkron")} disabled={sibuk}>
              Sinkron ruleset dan suara
            </button>
            <button onClick={() => kirim("kedip")} disabled={sibuk}>
              Kedipkan LED
            </button>
            <button onClick={() => kirim("diagnostik")} disabled={sibuk}>
              Diagnostik
            </button>
            <button onClick={() => kirim("ota")} disabled={sibuk}>
              Cek firmware baru
            </button>
            <button
              onClick={() => {
                if (confirm("Mulai ulang sarung tangan sekarang?")) kirim("mulai_ulang");
              }}
              disabled={sibuk}
            >
              Mulai ulang
            </button>
          </div>

          <div>
            <strong>Riwayat perintah</strong>
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.4rem", marginTop: "0.5rem" }}>
              {riwayat.length === 0 && <li style={{ color: "var(--redup)" }}>Belum ada perintah.</li>}
              {riwayat.map((r) => {
                const st = statusEfektif(r.status, r.diambil, sekarang);
                return (
                  <li key={r.id} style={{ border: "1px solid var(--garis)", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span>
                        <strong>{LABEL_PERINTAH[r.aksi as AksiPerintah] ?? r.aksi}</strong>
                        {r.param ? ` (${r.param})` : ""}
                      </span>
                      <span>
                        <span className="lencana">{st}</span>{" "}
                        {r.status === "menunggu" && (
                          <button onClick={() => batalkan(r)} disabled={sibuk}>
                            Batalkan
                          </button>
                        )}
                      </span>
                    </div>
                    <div style={{ color: "var(--redup)", fontSize: "0.85rem", overflowWrap: "anywhere" }}>
                      {new Date(r.dibuat).toLocaleTimeString("id-ID")}
                      {r.pesan ? ` · ${r.pesan}` : ""}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="kartu" style={{ margin: "1.5rem 0" }}>
        <h2 style={{ marginTop: 0 }}>Panduan tombol di sarung tangan (master)</h2>
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>1 klik: kalibrasi sensor kedua tangan (klik lagi untuk membatalkan). Hasilnya ada di halaman Kalibrasi.</li>
          <li>2 klik cepat: ganti bahasa (SIBI dan BISINDO).</li>
          <li>3 klik cepat: tandai akhir kalimat (Demo Live memotong kalimat di situ).</li>
          <li>4 klik cepat: ulangi suara kata terakhir.</li>
          <li>Tahan sekitar 1,5 detik lalu lepas: rekam pose. LED kuning berkedip menghitung mundur 3 detik, lalu merekam 3 detik.</li>
        </ul>
        <p className="catatan" style={{ maxWidth: "none", marginTop: "0.5rem" }}>
          Kilatan LED: hijau = kata terdeteksi, putih = akhir kalimat, merah = merekam atau gagal, biru muda
          atau ungu = bahasa berganti (SIBI atau BISINDO).
        </p>
      </section>
    </main>
  );
}
"use client";

import { useCallback, useEffect, useState } from "react";
import { SKALA_MV, type StatusJari } from "@/lib/kalibrasi";

type Jari = { nama: string; lurus: number; tekuk: number; selisih: number; status: StatusJari; catatan: string };
type Ringkas = { baik: number; lemah: number; ditolak: number };
type Tangan = { waktu: number; jari: Jari[]; ringkas: Ringkas };
type Entri = { waktu: number; sumber: string; kanan: Ringkas | null; kiri: Ringkas | null };
type Data = { ada: boolean; waktu?: number; sumber?: string; kanan?: Tangan | null; kiri?: Tangan | null; riwayat?: Entri[] };

const WARNA: Record<StatusJari, string> = { baik: "var(--aksen)", lemah: "#ffb84d", ditolak: "#ff8a8a" };
const LABEL: Record<StatusJari, string> = { baik: "Baik", lemah: "Lemah", ditolak: "Ditolak" };
const SUMBER: Record<string, string> = {
  tombol: "tombol di sarung tangan",
  web: "perintah dari web",
  serial: "Serial Monitor",
};

function lalu(ms: number) {
  if (!ms) return "-";
  const d = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (d < 60) return "baru saja";
  if (d < 3600) return `${Math.floor(d / 60)} menit lalu`;
  if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
  return new Date(ms).toLocaleString("id-ID");
}

const pct = (mv: number) => `${Math.min(100, Math.max(0, (mv / SKALA_MV) * 100))}%`;

function Jalur({ j }: { j: Jari }) {
  const awal = Math.min(j.lurus, j.tekuk);
  const akhir = Math.max(j.lurus, j.tekuk);
  const titik = (mv: number, isi: boolean) => (
    <span
      style={{
        position: "absolute",
        left: pct(mv),
        top: "50%",
        width: 12,
        height: 12,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: `2px solid ${WARNA[j.status]}`,
        background: isi ? WARNA[j.status] : "var(--kertas, #fff)",
      }}
    />
  );
  return (
    <div
      role="img"
      aria-label={`${j.nama}: lurus ${j.lurus} mV, kepalan ${j.tekuk} mV`}
      style={{ position: "relative", height: 14, background: "var(--garis)", borderRadius: 7 }}
    >
      <span
        style={{
          position: "absolute",
          left: pct(awal),
          width: `calc(${pct(akhir)} - ${pct(awal)})`,
          top: 4,
          bottom: 4,
          background: WARNA[j.status],
          opacity: 0.45,
        }}
      />
      {titik(j.lurus, false)}
      {titik(j.tekuk, true)}
    </div>
  );
}

function Kartu({ judul, t }: { judul: string; t?: Tangan | null }) {
  return (
    <section className="kartu" style={{ display: "grid", gap: "0.75rem" }}>
      <h2 style={{ margin: 0 }}>{judul}</h2>
      {!t ? (
        <p className="catatan" style={{ margin: 0 }}>Belum ada data kalibrasi.</p>
      ) : (
        <>
          <p className="catatan" style={{ margin: 0, maxWidth: "none" }}>
            Terakhir {lalu(t.waktu)}. {t.ringkas.baik} baik, {t.ringkas.lemah} lemah, {t.ringkas.ditolak} ditolak.
          </p>
          {t.jari.map((j) => (
            <div key={j.nama} style={{ display: "grid", gap: "0.3rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <strong>{j.nama}</strong>
                <span>
                  <span className="lencana">{LABEL[j.status]}</span> rentang {j.selisih} mV
                </span>
              </div>
              <Jalur j={j} />
              <span className="catatan" style={{ maxWidth: "none" }}>
                Lurus {j.lurus} mV, kepalan {j.tekuk} mV. {j.catatan}.
              </span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

export default function KalibrasiKlien() {
  const [data, setData] = useState<Data | null>(null);
  const [galat, setGalat] = useState("");

  const muat = useCallback(async () => {
    try {
      const res = await fetch("/api/kalibrasi", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setGalat("");
    } catch {
      setGalat("Tidak bisa memuat data kalibrasi. Coba lagi sebentar.");
    }
  }, []);

  useEffect(() => {
    muat();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") muat();
    }, 30000);
    return () => clearInterval(t);
  }, [muat]);

  if (galat && !data) return <p role="alert">{galat}</p>;
  if (!data) return <p>Memuat...</p>;
  if (!data.ada) {
    return (
      <div className="kartu">
        <p style={{ margin: 0 }}>Belum ada kalibrasi yang tercatat. Klik sekali tombol di sarung tangan untuk memulai.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <p className="catatan" style={{ maxWidth: "none", margin: 0 }}>
        Kalibrasi terakhir {lalu(data.waktu ?? 0)} lewat {SUMBER[data.sumber ?? ""] ?? "perangkat"}. Skala 0 sampai {SKALA_MV} mV.
        Lingkaran kosong = jari lurus, lingkaran penuh = kepalan.
      </p>
      <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Kartu judul="Tangan kanan" t={data.kanan} />
        <Kartu judul="Tangan kiri" t={data.kiri} />
      </div>

      {data.riwayat && data.riwayat.length > 1 && (
        <section className="kartu">
          <h2 style={{ marginTop: 0 }}>Riwayat</h2>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {data.riwayat.map((r, i) => (
              <li key={i}>
                {lalu(r.waktu)} ({SUMBER[r.sumber] ?? r.sumber}):{" "}
                {r.kanan ? `kanan ${r.kanan.baik} baik, ${r.kanan.lemah} lemah, ${r.kanan.ditolak} ditolak` : "kanan -"};{" "}
                {r.kiri ? `kiri ${r.kiri.baik} baik, ${r.kiri.lemah} lemah, ${r.kiri.ditolak} ditolak` : "kiri -"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
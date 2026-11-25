"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { KATEGORI, LABEL_KATEGORI, type Kategori } from "@/lib/kategori";
import { BAHASA, type Bahasa } from "@/lib/bahasa";
import type { JenisTangan } from "@/lib/pose";

export type KataKamus = {
  id: string;
  nama: string;
  teks: string;
  kategori: Kategori;
  bahasa: Bahasa;
  tangan: JenisTangan | null;
  audio_url: string;
};

const LABEL_TANGAN: Record<JenisTangan, string> = {
  kanan: "Satu tangan (kanan)",
  kiri: "Satu tangan (kiri)",
  dua: "Dua tangan",
};

export default function KamusKlien({ kata }: { kata: KataKamus[] }) {
  const [cari, setCari] = useState("");
  const [bhs, setBhs] = useState<Bahasa | "semua">("semua");
  const [kat, setKat] = useState<Kategori | "semua">("semua");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dalamBahasa = useMemo(
    () => kata.filter((k) => bhs === "semua" || k.bahasa === bhs),
    [kata, bhs]
  );

  const jumlahKat = useMemo(() => {
    const h: Record<string, number> = {};
    for (const k of dalamBahasa) h[k.kategori] = (h[k.kategori] ?? 0) + 1;
    return h;
  }, [dalamBahasa]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return dalamBahasa.filter(
      (k) =>
        (kat === "semua" || k.kategori === kat) &&
        (!q || k.nama.toLowerCase().includes(q) || k.teks.toLowerCase().includes(q))
    );
  }, [dalamBahasa, cari, kat]);

  function putar(url: string) {
    audioRef.current?.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.play().catch(() => {});
  }

  return (
    <>
      <div className="kamus-bar">
        <input
          type="search"
          placeholder="Cari kata..."
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          aria-label="Cari kata"
        />
        <div className="chips" role="group" aria-label="Bahasa isyarat">
          <button className="chip" aria-pressed={bhs === "semua"} onClick={() => { setBhs("semua"); setKat("semua"); }}>
            Semua bahasa ({kata.length})
          </button>
          {BAHASA.map((b) => (
            <button
              key={b}
              className="chip"
              aria-pressed={bhs === b}
              onClick={() => { setBhs(b); setKat("semua"); }}
            >
              {b} ({kata.filter((k) => k.bahasa === b).length})
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Kategori">
          <button className="chip" aria-pressed={kat === "semua"} onClick={() => setKat("semua")}>
            Semua kategori ({dalamBahasa.length})
          </button>
          {KATEGORI.filter((k) => (jumlahKat[k] ?? 0) > 0).map((k) => (
            <button key={k} className="chip" aria-pressed={kat === k} onClick={() => setKat(k)}>
              {LABEL_KATEGORI[k]} ({jumlahKat[k]})
            </button>
          ))}
        </div>
      </div>

      {tampil.length === 0 ? (
        <div className="kartu">
          <p>Tidak ada kata yang cocok.</p>
        </div>
      ) : (
        <div className="grid3">
          {tampil.map((k) => (
            <div key={k.id} className="kartu">
              <p style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "0 0 0.5rem" }}>
                <span className="lencana">{k.bahasa}</span>
                {k.tangan && <span className="lencana">{LABEL_TANGAN[k.tangan]}</span>}
              </p>
              <h3>{k.nama}</h3>
              <p>{k.teks}</p>
              <p>
                <Link href={`/kamus/${k.id}`}>Lihat detail</Link>
              </p>
              {k.audio_url && (
                <button className="kartu-aksi" onClick={() => putar(k.audio_url)}>
                  Dengarkan
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
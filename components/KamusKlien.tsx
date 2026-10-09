"use client";

import { useMemo, useRef, useState } from "react";
import { KATEGORI, LABEL_KATEGORI, type Kategori } from "@/lib/kategori";

export type KataKamus = {
  id: string;
  nama: string;
  teks: string;
  kategori: Kategori;
  audio_url: string;
};

export default function KamusKlien({ kata }: { kata: KataKamus[] }) {
  const [cari, setCari] = useState("");
  const [kat, setKat] = useState<Kategori | "semua">("semua");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const jumlah = useMemo(() => {
    const h: Record<string, number> = {};
    for (const k of kata) h[k.kategori] = (h[k.kategori] ?? 0) + 1;
    return h;
  }, [kata]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return kata.filter(
      (k) =>
        (kat === "semua" || k.kategori === kat) &&
        (!q || k.nama.toLowerCase().includes(q) || k.teks.toLowerCase().includes(q))
    );
  }, [kata, cari, kat]);

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
        <div className="chips">
          <button
            className="chip"
            aria-pressed={kat === "semua"}
            onClick={() => setKat("semua")}
          >
            Semua ({kata.length})
          </button>
          {KATEGORI.filter((k) => (jumlah[k] ?? 0) > 0).map((k) => (
            <button
              key={k}
              className="chip"
              aria-pressed={kat === k}
              onClick={() => setKat(k)}
            >
              {LABEL_KATEGORI[k]} ({jumlah[k]})
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
              <h3>{k.nama}</h3>
              <p>{k.teks}</p>
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
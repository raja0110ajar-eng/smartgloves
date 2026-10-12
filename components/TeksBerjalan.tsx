"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

function Bintang() {
  return (
    <svg className="tb-bintang" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <polygon
        points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6"
        fill="currentColor"
      />
    </svg>
  );
}

export default function TeksBerjalan({ pesan }: { pesan: string[] }) {
  const [jeda, setJeda] = useState(false);
  if (pesan.length === 0) return null;

  // Makin panjang teksnya, makin lama satu putaran, supaya kecepatan baca tetap nyaman
  const karakter = pesan.reduce((a, p) => a + p.length, 0);
  const durasi = Math.max(30, Math.round(karakter * 0.22));

  const daftar = (tersembunyi: boolean) => (
    <ul className="tb-daftar" aria-hidden={tersembunyi || undefined}>
      {pesan.map((p, i) => (
        <li key={i}>
          <Bintang />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="tb" aria-label="Pengumuman" data-jeda={jeda || undefined}>
      <span className="tb-label">Info</span>
      <div className="tb-jendela">
        <div className="tb-jalur" style={{ "--durasi": `${durasi}s` } as React.CSSProperties}>
          {daftar(false)}
          {daftar(true)}
        </div>
      </div>
      <button
        type="button"
        className="tb-tombol"
        onClick={() => setJeda(!jeda)}
        aria-pressed={jeda}
        aria-label={jeda ? "Jalankan teks berjalan" : "Hentikan teks berjalan"}
      >
        {jeda ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
    </section>
  );
}
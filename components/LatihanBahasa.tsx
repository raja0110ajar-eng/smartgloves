"use client";

import { useEffect, useState } from "react";
import { BAHASA, type Bahasa } from "@/lib/bahasa";
import { saringBahasa, type Kata } from "@/lib/latihan";
import LatihanKlien from "./LatihanKlien";

const KUNCI = "smartgloves-latihan-bahasa";

export default function LatihanBahasa({ kata }: { kata: Kata[] }) {
  const [bahasa, setBahasa] = useState<Bahasa>("SIBI");

  useEffect(() => {
    try {
      const b = localStorage.getItem(KUNCI);
      if (b === "SIBI" || b === "BISINDO") setBahasa(b);
    } catch {
      /* abaikan */
    }
  }, []);

  function pilih(b: Bahasa) {
    setBahasa(b);
    try {
      localStorage.setItem(KUNCI, b);
    } catch {
      /* abaikan */
    }
  }

  return (
    <>
      <div className="chips" role="group" aria-label="Bahasa isyarat" style={{ marginBottom: "0.5rem" }}>
        {BAHASA.map((b) => (
          <button key={b} className="chip" aria-pressed={bahasa === b} onClick={() => pilih(b)}>
            {b} ({saringBahasa(kata, b).length})
          </button>
        ))}
      </div>
      <p className="catatan" style={{ maxWidth: "none", marginBottom: "1rem" }}>
        Pastikan sarung tangan berbahasa sama dengan pilihan ini. Tahan tombol di sarung tangan sekitar
        1 detik untuk berganti bahasa.
      </p>
      <LatihanKlien key={bahasa} kata={saringBahasa(kata, bahasa)} bahasa={bahasa} />
    </>
  );
}   
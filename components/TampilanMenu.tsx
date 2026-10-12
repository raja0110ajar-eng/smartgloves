"use client";

import { useEffect, useRef, useState } from "react";
import { Contrast, Minus, Moon, Plus, SlidersHorizontal, Sun } from "lucide-react";

const UKURAN = [90, 100, 115, 130]; // persen

function simpan(kunci: string, nilai: string) {
  try {
    localStorage.setItem(kunci, nilai);
  } catch {
    /* abaikan kalau penyimpanan diblokir */
  }
}

function Kontrol() {
  const [tema, setTema] = useState<"terang" | "gelap">("terang");
  const [ukuran, setUkuran] = useState(100);
  const [kontras, setKontras] = useState(false);

  useEffect(() => {
    const d = document.documentElement;
    setTema(d.dataset.tema === "gelap" ? "gelap" : "terang");
    setKontras(d.dataset.kontras === "tinggi");
    const u = Number.parseInt(d.style.fontSize, 10);
    setUkuran(Number.isFinite(u) ? u : 100);
  }, []);

  function gantiTema() {
    const baru = tema === "terang" ? "gelap" : "terang";
    setTema(baru);
    document.documentElement.dataset.tema = baru;
    simpan("tema", baru);
  }

  function aturUkuran(arah: -1 | 0 | 1) {
    const i = UKURAN.indexOf(ukuran);
    const sekarang = i === -1 ? 1 : i;
    const baru =
      arah === 0 ? 100 : UKURAN[Math.min(UKURAN.length - 1, Math.max(0, sekarang + arah))];
    setUkuran(baru);
    document.documentElement.style.fontSize = `${baru}%`;
    simpan("ukuran", String(baru));
  }

  function gantiKontras() {
    const baru = !kontras;
    setKontras(baru);
    if (baru) document.documentElement.dataset.kontras = "tinggi";
    else delete document.documentElement.dataset.kontras;
    simpan("kontras", baru ? "tinggi" : "normal");
  }

  return (
    <div className="tampilan-kontrol">
      <div className="tampilan-baris">
        <span>Ukuran teks {ukuran}%</span>
        <span className="tampilan-grup" role="group" aria-label="Ukuran teks">
          <button type="button" onClick={() => aturUkuran(-1)} aria-label="Perkecil teks">
            <Minus size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => aturUkuran(0)}>
            Normal
          </button>
          <button type="button" onClick={() => aturUkuran(1)} aria-label="Perbesar teks">
            <Plus size={16} aria-hidden="true" />
          </button>
        </span>
      </div>
      <button type="button" className="tampilan-opsi" onClick={gantiTema}>
        {tema === "terang" ? (
          <Moon size={16} aria-hidden="true" />
        ) : (
          <Sun size={16} aria-hidden="true" />
        )}
        {tema === "terang" ? "Pakai tema gelap" : "Pakai tema terang"}
      </button>
      <button type="button" className="tampilan-opsi" onClick={gantiKontras} aria-pressed={kontras}>
        <Contrast size={16} aria-hidden="true" />
        Kontras tinggi: {kontras ? "nyala" : "mati"}
      </button>
    </div>
  );
}

export default function TampilanMenu({ sebaris = false }: { sebaris?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (sebaris) return;
    const klik = (e: MouseEvent) => {
      const d = ref.current;
      if (d?.open && !d.contains(e.target as Node)) d.open = false;
    };
    const tombol = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) ref.current.open = false;
    };
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", tombol);
    };
  }, [sebaris]);

  if (sebaris) return <Kontrol />;

  return (
    <details className="tampilan" ref={ref}>
      <summary>
        <SlidersHorizontal size={16} aria-hidden="true" />
        Tampilan
      </summary>
      <div className="tampilan-isi">
        <Kontrol />
      </div>
    </details>
  );
}
"use client";

import { useEffect, useState } from "react";

const UKURAN = [90, 100, 115, 130]; // persen

function simpan(kunci: string, nilai: string) {
  try {
    localStorage.setItem(kunci, nilai);
  } catch {
    /* abaikan kalau penyimpanan diblokir */
  }
}

export default function TampilanMenu() {
  const [tema, setTema] = useState<"gelap" | "terang">("gelap");
  const [ukuran, setUkuran] = useState(100);
  const [kontras, setKontras] = useState(false);

  useEffect(() => {
    const d = document.documentElement;
    setTema(d.dataset.tema === "terang" ? "terang" : "gelap");
    setKontras(d.dataset.kontras === "tinggi");
    const u = Number.parseInt(d.style.fontSize, 10);
    setUkuran(Number.isFinite(u) ? u : 100);
  }, []);

  function gantiTema() {
    const baru = tema === "gelap" ? "terang" : "gelap";
    setTema(baru);
    document.documentElement.dataset.tema = baru;
    simpan("tema", baru);
  }

  function aturUkuran(arah: -1 | 0 | 1) {
    const i = UKURAN.indexOf(ukuran);
    const sekarang = i === -1 ? 1 : i;
    const baru = arah === 0 ? 100 : UKURAN[Math.min(UKURAN.length - 1, Math.max(0, sekarang + arah))];
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
    <details className="tampilan">
      <summary>Tampilan</summary>
      <div className="tampilan-isi">
        <div className="tampilan-baris">
          <span>Ukuran teks: {ukuran}%</span>
          <button type="button" onClick={() => aturUkuran(-1)} aria-label="Perkecil teks">
            A-
          </button>
          <button type="button" onClick={() => aturUkuran(0)} aria-label="Ukuran teks normal">
            Normal
          </button>
          <button type="button" onClick={() => aturUkuran(1)} aria-label="Perbesar teks">
            A+
          </button>
        </div>
        <div className="tampilan-baris">
          <button type="button" onClick={gantiTema}>
            {tema === "gelap" ? "Pakai tema terang" : "Pakai tema gelap"}
          </button>
        </div>
        <div className="tampilan-baris">
          <button type="button" onClick={gantiKontras} aria-pressed={kontras}>
            Kontras tinggi: {kontras ? "nyala" : "mati"}
          </button>
        </div>
      </div>
    </details>
  );
}
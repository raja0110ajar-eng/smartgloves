"use client";

import { useEffect, useState } from "react";

export default function TemaToggle() {
  const [tema, setTema] = useState<"gelap" | "terang">("gelap");

  useEffect(() => {
    setTema(document.documentElement.dataset.tema === "terang" ? "terang" : "gelap");
  }, []);

  function ganti() {
    const baru = tema === "gelap" ? "terang" : "gelap";
    setTema(baru);
    document.documentElement.dataset.tema = baru;
    try {
      localStorage.setItem("tema", baru);
    } catch {
      /* abaikan kalau penyimpanan diblokir */
    }
  }

  return (
    <button
      type="button"
      onClick={ganti}
      aria-label="Ganti tema terang atau gelap"
      style={{ padding: "0.25rem 0.6rem" }}
    >
      {tema === "gelap" ? "Mode terang" : "Mode gelap"}
    </button>
  );
}
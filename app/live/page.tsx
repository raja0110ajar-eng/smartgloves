"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

type Item = { id: string; teks: string; ms: number };

function kapan(ms: number, sekarang: number) {
  const s = Math.max(0, Math.round((sekarang - ms) / 1000));
  if (s < 10) return "baru saja";
  if (s < 60) return `${s} detik lalu`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const j = Math.round(m / 60);
  if (j < 24) return `${j} jam lalu`;
  return `${Math.round(j / 24)} hari lalu`;
}

export default function LivePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sekarang, setSekarang] = useState(() => Date.now());
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("waktu", "desc"), limit(10));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            teks: String(d.data().teks ?? ""),
            ms: d.data().waktu?.toMillis?.() ?? Date.now(),
          }))
        );
      },
      (err) => setError(err.message)
    );
    return () => unsub();
  }, []);

  // Perbarui keterangan "x menit lalu" tiap 15 detik
  useEffect(() => {
    const t = setInterval(() => setSekarang(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  function layarPenuh() {
    if (document.fullscreenElement) document.exitFullscreen();
    else ref.current?.requestFullscreen?.();
  }

  const terbaru = items[0];

  return (
    <main ref={ref} className="live">
      <button className="live-tombol" onClick={layarPenuh}>
        Layar penuh
      </button>

      {terbaru ? (
        <>
          <h1 className="live-teks">{terbaru.teks}</h1>
          <p className="live-info">{kapan(terbaru.ms, sekarang)}</p>
        </>
      ) : (
        <>
          <h1 className="live-teks">Menunggu gerakan...</h1>
          <p className="live-info">Teks akan muncul di sini saat sarung tangan bergerak.</p>
        </>
      )}

      {error && <p style={{ color: "#ff8080" }}>Error: {error}</p>}

      {items.length > 1 && (
        <ul className="live-riwayat">
          {items.slice(1).map((it) => (
            <li key={it.id}>{it.teks}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

type Item = { id: string; teks: string };

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "events"),
      orderBy("waktu", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            teks: String(d.data().teks ?? ""),
          }))
        );
      },
      (err) => setError(err.message)
    );
    return () => unsub();
  }, []);

const terbaru = items[0]?.teks ?? "Menunggu gerakan...";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0f",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "clamp(3rem, 12vw, 8rem)", margin: 0 }}>
        {terbaru}
      </h1>

      {error && <p style={{ color: "#ff8080" }}>Error: {error}</p>}

    </main>
  );
}

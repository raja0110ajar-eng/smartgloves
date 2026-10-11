"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opsi: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const CONTOH = [
  "Apa itu SmartGloves?",
  "Bagaimana cara kerjanya?",
  "Bahan apa saja yang dipakai?",
  "Isyarat apa saja yang didukung?",
];

type Item = {
  id: number;
  q: string;
  a: string;
  sumber: { slug: string; judul: string }[];
  dari: string;
};

export default function TanyaKlien() {
  const [pertanyaan, setPertanyaan] = useState("");
  const [riwayat, setRiwayat] = useState<Item[]>([]);
  const [token, setToken] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const kotak = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const kunci = useRef(false);
  const nomor = useRef(0);

  function pasangWidget() {
    if (!SITE_KEY || !window.turnstile || !kotak.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(kotak.current, {
      sitekey: SITE_KEY,
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }

  // Kalau skrip Turnstile sudah termuat (mis. kembali ke halaman ini), pasang langsung
  useEffect(() => {
    pasangWidget();
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tanya(teks: string) {
    const q = teks.trim();
    if (q.length < 3 || kunci.current) return;
    if (SITE_KEY && !token) {
      setPesan("Tunggu verifikasi keamanan selesai, lalu coba lagi.");
      return;
    }
    kunci.current = true;
    setSibuk(true);
    setPesan("");
    try {
      const res = await fetch("/api/tanya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pertanyaan: q, token }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Gagal (HTTP ${res.status})`);
      nomor.current += 1;
      setRiwayat((r) =>
        [{ id: nomor.current, q, a: d.jawaban, sumber: d.sumber ?? [], dari: d.dari }, ...r].slice(0, 20)
      );
      setPertanyaan("");
    } catch (e) {
      setPesan(
        e instanceof TypeError
          ? "Koneksi bermasalah. Periksa sinyal lalu coba lagi."
          : (e as Error).message
      );
    } finally {
      // Token Turnstile hanya berlaku sekali, jadi minta yang baru
      setToken("");
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
      kunci.current = false;
      setSibuk(false);
    }
  }

  const menungguVerifikasi = !!SITE_KEY && !token;

  return (
    <div className="tanya">
      {SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={pasangWidget}
        />
      )}

      <p className="catatan" style={{ maxWidth: "none" }}>
        Asisten ini dijawab oleh AI dan bisa keliru. Jawabannya hanya berdasarkan isi situs
        ini, dan tidak menjelaskan bentuk jari suatu isyarat. Jangan menulis data pribadi.
      </p>

      <div className="chips">
        {CONTOH.map((c) => (
          <button
            key={c}
            className="chip"
            onClick={() => tanya(c)}
            disabled={sibuk || menungguVerifikasi}
          >
            {c}
          </button>
        ))}
      </div>

      <form
        className="tanya-form"
        onSubmit={(e) => {
          e.preventDefault();
          tanya(pertanyaan);
        }}
      >
        <textarea
          rows={3}
          maxLength={300}
          placeholder="Tulis pertanyaanmu tentang SmartGloves..."
          value={pertanyaan}
          onChange={(e) => setPertanyaan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              tanya(pertanyaan);
            }
          }}
        />
        <div className="tanya-bawah">
          <span className="catatan">{pertanyaan.length}/300</span>
          <button
            type="submit"
            disabled={sibuk || menungguVerifikasi || pertanyaan.trim().length < 3}
          >
            {sibuk ? "Menjawab..." : menungguVerifikasi ? "Memverifikasi..." : "Tanya"}
          </button>
        </div>
      </form>

      <div ref={kotak} />
      {pesan && <p style={{ color: "#ff8a8a", margin: 0 }}>{pesan}</p>}

      <ul className="tanya-daftar" aria-live="polite">
        {riwayat.map((it) => (
          <li key={it.id} className="kartu">
            <p className="tanya-q">{it.q}</p>
            <p className="tanya-a">{it.a}</p>
            {it.sumber.length > 0 && (
              <p className="tanya-meta">
                Sumber:{" "}
                {it.sumber.map((s, i) => (
                  <span key={s.slug}>
                    {i > 0 && ", "}
                    <Link href={`/${s.slug}`}>{s.judul}</Link>
                  </span>
                ))}
              </p>
            )}
            <p className="tanya-meta">
              {it.dari === "cache" ? "Jawaban tersimpan" : "Dijawab AI"}, bisa keliru.
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
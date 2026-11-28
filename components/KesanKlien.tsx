"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { MAKS_PESAN } from "@/lib/kesanAturan";

type Item = { id: string; nama: string; asal: string; pesan: string; waktu: number };
type TS = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id?: string) => void };

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const ts = () => (window as unknown as { turnstile?: TS }).turnstile;

export default function KesanKlien() {
  const [nama, setNama] = useState("");
  const [asal, setAsal] = useState("");
  const [pesan, setPesan] = useState("");
  const [situs, setSitus] = useState(""); // kolom jebakan
  const [token, setToken] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [info, setInfo] = useState<{ ok: boolean; teks: string } | null>(null);
  const [daftar, setDaftar] = useState<Item[]>([]);
  const [lagi, setLagi] = useState(false);
  const [berikut, setBerikut] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const kotak = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const kunci = useRef(false);
  const sudahLebih = useRef(false);

  const muat = useCallback(async (awal: boolean, sebelum = 0) => {
    try {
      const res = await fetch(`/api/kesan?batas=12${sebelum ? `&sebelum=${sebelum}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setDaftar((lama) => (awal ? d.daftar : [...lama, ...d.daftar]));
      setLagi(d.lagi);
      setBerikut(d.berikut);
    } catch {
      /* biarkan daftar yang ada */
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat(true);
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && !sudahLebih.current) muat(true);
    }, 60000);
    return () => clearInterval(t);
  }, [muat]);

  function pasangWidget() {
    if (!SITE_KEY || !ts() || !kotak.current || widgetId.current) return;
    widgetId.current = ts()!.render(kotak.current, {
      sitekey: SITE_KEY,
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }

  useEffect(() => {
    pasangWidget();
    return () => {
      if (widgetId.current && ts()) ts()!.remove(widgetId.current);
      widgetId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (kunci.current) return;
    if (SITE_KEY && !token) {
      setInfo({ ok: false, teks: "Tunggu verifikasi keamanan selesai, lalu coba lagi." });
      return;
    }
    kunci.current = true;
    setSibuk(true);
    setInfo(null);
    try {
      const res = await fetch("/api/kesan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, asal, pesan, token, situs }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Gagal (HTTP ${res.status})`);
      setPesan("");
      if (d.status === "tampil") {
        setInfo({ ok: true, teks: "Terima kasih! Pesanmu sudah tampil di bawah." });
        await muat(true);
      } else {
        setInfo({ ok: true, teks: "Terima kasih! Pesanmu akan tampil setelah disetujui admin." });
      }
    } catch (err) {
      setInfo({
        ok: false,
        teks: err instanceof TypeError ? "Koneksi bermasalah. Periksa sinyal lalu coba lagi." : (err as Error).message,
      });
    } finally {
      setToken("");
      if (widgetId.current && ts()) ts()!.reset(widgetId.current);
      kunci.current = false;
      setSibuk(false);
    }
  }

  const menunggu = !!SITE_KEY && !token;

  return (
    <div className="kesan">
      {SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={pasangWidget} />
      )}

      <form className="kartu kesan-form" onSubmit={kirim}>
        <div className="kesan-baris">
          <input placeholder="Nama (boleh dikosongkan)" maxLength={40} value={nama} onChange={(e) => setNama(e.target.value)} aria-label="Nama" />
          <input placeholder="Asal atau sekolah (opsional)" maxLength={60} value={asal} onChange={(e) => setAsal(e.target.value)} aria-label="Asal" />
        </div>
        <textarea
          rows={4}
          maxLength={MAKS_PESAN}
          placeholder="Tulis kesan atau pesanmu..."
          value={pesan}
          onChange={(e) => setPesan(e.target.value)}
          aria-label="Pesan"
          required
        />
        {/* Kolom jebakan untuk bot, tidak terlihat dan tidak bisa difokuskan */}
        <input
          name="situs"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={situs}
          onChange={(e) => setSitus(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
        <p className="catatan" style={{ maxWidth: "none", margin: 0 }}>
          Nama, asal, dan pesan akan tampil publik setelah disetujui admin. Jangan menulis nomor telepon, email, atau
          alamat. Pesan berisi tautan atau kata kasar akan ditahan.
        </p>
        <div ref={kotak} />
        <div className="kesan-baris" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <span className="catatan">{pesan.length}/{MAKS_PESAN}</span>
          <button type="submit" disabled={sibuk || menunggu || pesan.trim().length < 5}>
            {sibuk ? "Mengirim..." : menunggu ? "Memverifikasi..." : "Kirim pesan"}
          </button>
        </div>
        {info && (
          <p role={info.ok ? "status" : "alert"} style={{ margin: 0, color: info.ok ? undefined : "#ff8a8a" }}>
            {info.teks}
          </p>
        )}
      </form>

      <h2 style={{ marginBottom: 0 }}>Pesan dari pengunjung</h2>
      {memuat ? (
        <p>Memuat...</p>
      ) : daftar.length === 0 ? (
        <div className="kartu"><p style={{ margin: 0 }}>Belum ada pesan yang tampil. Jadilah yang pertama!</p></div>
      ) : (
        <ul className="kesan-daftar" aria-live="polite">
          {daftar.map((k) => (
            <li key={k.id} className="kartu">
              <blockquote className="kesan-kutip">{k.pesan}</blockquote>
              <p className="kesan-meta">
                <strong>{k.nama}</strong>
                {k.asal ? `, ${k.asal}` : ""} · {new Date(k.waktu).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </li>
          ))}
        </ul>
      )}
      {lagi && (
        <div>
          <button
            onClick={() => {
              sudahLebih.current = true;
              muat(false, berikut);
            }}
          >
            Muat lebih banyak
          </button>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

type Item = {
  id: string;
  teks: string;
  ms: number;
  skor: number | null;
  simulasi: boolean;
};

// Kata yang datang berdekatan (selisih kurang dari ini) digabung jadi satu kalimat
const JEDA_KALIMAT_MS = 4000;

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

// items: terbaru lebih dulu. Hasil: kalimat terbaru lebih dulu.
function bentukKalimat(items: Item[]) {
  const urut = [...items].reverse();
  const hasil: { id: string; kata: string[]; ms: number }[] = [];
  for (const it of urut) {
    const akhir = hasil[hasil.length - 1];
    if (akhir && it.ms - akhir.ms <= JEDA_KALIMAT_MS) {
      akhir.kata.push(it.teks);
      akhir.ms = it.ms;
    } else {
      hasil.push({ id: it.id, kata: [it.teks], ms: it.ms });
    }
  }
  return hasil
    .reverse()
    .map((k) => ({ id: k.id, teks: k.kata.join(" "), ms: k.ms }));
}

function cariSuaraIndonesia() {
  return (
    window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith("id")) ?? null
  );
}

export default function LivePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [disembunyi, setDisembunyi] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [sekarang, setSekarang] = useState(() => Date.now());
  const [suara, setSuara] = useState(false);
  const [mendukungSuara, setMendukungSuara] = useState(true);
  const [adaSuaraId, setAdaSuaraId] = useState(true);
  const [pesan, setPesan] = useState("");

  const ref = useRef<HTMLElement>(null);
  const suaraRef = useRef(false);
  const pertama = useRef(true);

  useEffect(() => {
    suaraRef.current = suara;
  }, [suara]);

  function ucapkan(teks: string) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(teks);
    u.lang = "id-ID";
    const v = cariSuaraIndonesia();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  // Cek dukungan suara dan ketersediaan suara Indonesia di perangkat ini
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setMendukungSuara(false);
      return;
    }
    const cek = () => setAdaSuaraId(cariSuaraIndonesia() !== null);
    cek();
    window.speechSynthesis.addEventListener("voiceschanged", cek);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", cek);
  }, []);

  // Dengarkan event baru dari Firestore
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("waktu", "desc"), limit(30));
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Suara hanya untuk gerakan BARU, bukan riwayat yang sudah ada saat halaman dibuka
        if (pertama.current) {
          pertama.current = false;
        } else if (suaraRef.current) {
          snap
            .docChanges()
            .filter((c) => c.type === "added")
            .map((c) => ({
              teks: String(c.doc.data().teks ?? ""),
              ms: c.doc.data().waktu?.toMillis?.() ?? Date.now(),
            }))
            .sort((a, b) => a.ms - b.ms)
            .forEach((x) => ucapkan(x.teks));
        }

        setItems(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              teks: String(x.teks ?? ""),
              ms: x.waktu?.toMillis?.() ?? Date.now(),
              skor: typeof x.skor === "number" ? x.skor : null,
              simulasi: x.device_id === "simulator",
            };
          })
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

  const tampil = useMemo(
    () => items.filter((i) => !disembunyi.has(i.id)),
    [items, disembunyi]
  );
  const kalimat = useMemo(() => bentukKalimat(tampil), [tampil]);
  const terbaru = tampil[0];

  function ubahSuara() {
    if (!suara) {
      setSuara(true);
      ucapkan("Suara aktif");
    } else {
      window.speechSynthesis.cancel();
      setSuara(false);
    }
  }

  function layarPenuh() {
    if (document.fullscreenElement) document.exitFullscreen();
    else ref.current?.requestFullscreen?.();
  }

  function kosongkan() {
    setDisembunyi(new Set([...disembunyi, ...items.map((i) => i.id)]));
  }

  function kabari(teks: string) {
    setPesan(teks);
    setTimeout(() => setPesan(""), 2500);
  }

  async function salin(teks: string) {
    try {
      await navigator.clipboard.writeText(teks);
      kabari("Disalin.");
    } catch {
      kabari("Gagal menyalin. Sorot teksnya lalu salin manual.");
    }
  }

  return (
    <main ref={ref} className="live">
      <div className="live-bar">
        {mendukungSuara && (
          <button onClick={ubahSuara}>
            {suara ? "Suara: nyala (klik untuk mati)" : "Aktifkan suara"}
          </button>
        )}
        <button onClick={layarPenuh}>Layar penuh</button>
      </div>

      {!mendukungSuara && (
        <p className="catatan">Browser ini tidak mendukung suara otomatis.</p>
      )}
      {mendukungSuara && suara && !adaSuaraId && (
        <p className="catatan">
          Perangkat ini tidak punya suara bahasa Indonesia, jadi pengucapan mungkin
          terdengar aneh.
        </p>
      )}

      {terbaru ? (
        <>
          <h1 className="live-teks">{terbaru.teks}</h1>
          <p className="live-info">{kapan(terbaru.ms, sekarang)}</p>
          {terbaru.skor !== null && (
            <div className="skor">
              <span>
                Kecocokan pose: {terbaru.skor}%{terbaru.simulasi ? " (simulasi)" : ""}
              </span>
              <div className="skor-bar">
                <div style={{ width: `${terbaru.skor}%` }} />
              </div>
              <p className="catatan">
                Skor menunjukkan seberapa dekat bacaan sensor dengan pose yang direkam,
                bukan peluang bahwa tebakan benar.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <h1 className="live-teks">Menunggu gerakan...</h1>
          <p className="live-info">
            Teks akan muncul di sini saat sarung tangan bergerak.
          </p>
        </>
      )}

      {error && <p style={{ color: "#ff8080" }}>Error: {error}</p>}

      {kalimat.length > 0 && (
        <section className="kalimat-wadah">
          <div className="kalimat-kepala">
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Riwayat kalimat</h2>
            <span style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button onClick={() => salin(kalimat.map((k) => k.teks).join("\n"))}>
                Salin semua
              </button>
              <button onClick={kosongkan}>Kosongkan tampilan</button>
            </span>
          </div>
          <ul className="kalimat-daftar">
            {kalimat.slice(0, 8).map((k) => (
              <li key={k.id} className="kalimat-item">
                <span>{k.teks}</span>
                <button onClick={() => salin(k.teks)}>Salin</button>
              </li>
            ))}
          </ul>
          <p className="catatan" style={{ marginTop: "0.5rem" }}>
            &quot;Kosongkan&quot; hanya membersihkan tampilan di perangkat ini, data tidak
            dihapus.
          </p>
        </section>
      )}

      {pesan && <p className="catatan">{pesan}</p>}
    </main>
  );
}
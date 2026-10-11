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
import { kondisiPerangkat, teksDurasi } from "@/lib/statusBantu";

type Item = {
  id: string;
  teks: string;
  ms: number;
  skor: number | null;
  simulasi: boolean;
};

type StatusState = {
  siap: boolean;
  gagal: boolean;
  detik: number | null;
  diterima: number;
  batas: boolean;
};

// Kata yang datang berdekatan (selisih kurang dari ini) digabung jadi satu kalimat
const JEDA_KALIMAT_MS = 4000;

const PESAN_DATA: Record<string, string> = {
  "permission-denied":
    "Akses ke data langsung ditolak. Hubungi admin untuk memeriksa pengaturan keamanan.",
  unavailable: "Koneksi ke data langsung terputus. Periksa internet lalu coba lagi.",
};

const jam = (ms: number) => new Date(ms).toLocaleTimeString("id-ID");

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
  const [galatData, setGalatData] = useState<string | null>(null);
  const [ulang, setUlang] = useState(0);
  const [sekarang, setSekarang] = useState(() => Date.now());
  const [suara, setSuara] = useState(false);
  const [mendukungSuara, setMendukungSuara] = useState(true);
  const [adaSuaraId, setAdaSuaraId] = useState(true);
  const [pesan, setPesan] = useState("");
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState<StatusState>({
    siap: false,
    gagal: false,
    detik: null,
    diterima: 0,
    batas: false,
  });

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

  // Dukungan suara dan ketersediaan suara Indonesia di perangkat ini
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

  // Status koneksi browser pengunjung
  useEffect(() => {
    const naik = () => setOnline(true);
    const turun = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", naik);
    window.addEventListener("offline", turun);
    return () => {
      window.removeEventListener("online", naik);
      window.removeEventListener("offline", turun);
    };
  }, []);

  // Dengarkan event baru dari Firestore. Berganti "ulang" memasang pendengar baru.
  useEffect(() => {
    pertama.current = true;
    setGalatData(null);
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
      (err) => {
        const kode = (err as { code?: string }).code ?? "";
        setGalatData(PESAN_DATA[kode] ?? "Tidak bisa memuat data langsung. Coba muat ulang halaman.");
      }
    );
    return () => unsub();
  }, [ulang]);

  // Status perangkat dari server, dicek tiap 20 detik (dijeda saat tab tidak terlihat)
  useEffect(() => {
    let batal = false;
    async function muatStatus() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) throw new Error("gagal");
        const d = await res.json();
        if (!batal) {
          setStatus({
            siap: true,
            gagal: false,
            detik: typeof d.detikLalu === "number" ? d.detikLalu : null,
            diterima: Date.now(),
            batas: d.batasTercapai === true,
          });
        }
      } catch {
        if (!batal) setStatus((s) => ({ ...s, gagal: true }));
      }
    }
    muatStatus();
    const t = setInterval(muatStatus, 20_000);
    const lihat = () => {
      if (document.visibilityState === "visible") muatStatus();
    };
    document.addEventListener("visibilitychange", lihat);
    return () => {
      batal = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", lihat);
    };
  }, []);

  // Perbarui keterangan waktu tiap 5 detik
  useEffect(() => {
    const t = setInterval(() => setSekarang(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const tampil = useMemo(
    () => items.filter((i) => !disembunyi.has(i.id)),
    [items, disembunyi]
  );
  const kalimat = useMemo(() => bentukKalimat(tampil), [tampil]);
  const terbaru = tampil[0];

  const detikPerangkat =
    status.detik === null
      ? null
      : status.detik + Math.round((sekarang - status.diterima) / 1000);
  const kondisi = status.siap ? kondisiPerangkat(detikPerangkat) : null;

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

      <section className="status-bar" aria-label="Status koneksi">
        <div className="status-baris">
          <span className={`titik ${kondisi ?? "belum"}`} aria-hidden="true" />
          <strong>
            {kondisi === null
              ? "Memeriksa perangkat..."
              : kondisi === "online"
                ? "Perangkat online"
                : kondisi === "putus"
                  ? "Perangkat tidak terlihat"
                  : "Perangkat belum pernah terhubung"}
          </strong>
          {kondisi === "online" && detikPerangkat !== null && (
            <span>terlihat {teksDurasi(detikPerangkat)}</span>
          )}
          {kondisi === "putus" && detikPerangkat !== null && (
            <span>sejak {teksDurasi(detikPerangkat)}</span>
          )}
        </div>
        <div className="status-baris">
          <span>
            Data terakhir:{" "}
            {terbaru
              ? `diterima pukul ${jam(terbaru.ms)} (${teksDurasi((sekarang - terbaru.ms) / 1000)})`
              : "belum ada"}
          </span>
        </div>
        {kondisi === "putus" && (
          <p className="status-info">
            Periksa daya dan koneksi WiFi sarung tangan. Teks baru tidak akan muncul sampai
            perangkat terhubung lagi.
          </p>
        )}
        {status.gagal && (
          <p className="status-info">Status perangkat tidak dapat diperiksa saat ini.</p>
        )}
        <p className="status-info">
          &quot;Online&quot; berarti perangkat terhubung ke server, bukan berarti sedang dipakai.
        </p>
      </section>

      {!online && (
        <p role="alert" className="status-galat">
          Perangkatmu sedang offline, jadi teks baru tidak bisa diterima. Periksa koneksi internet.
        </p>
      )}
      {status.batas && (
        <p role="alert" className="status-galat">
          Batas pengiriman data harian tercapai. Teks baru dari sarung tangan tidak akan muncul
          sampai besok.
        </p>
      )}
      {galatData && (
        <p role="alert" className="status-galat">
          {galatData}{" "}
          <button onClick={() => setUlang((u) => u + 1)}>Coba lagi</button>
        </p>
      )}

      {!mendukungSuara && (
        <p className="catatan">Browser ini tidak mendukung suara otomatis.</p>
      )}
      {mendukungSuara && suara && !adaSuaraId && (
        <p className="catatan">
          Perangkat ini tidak punya suara bahasa Indonesia, jadi pengucapan mungkin
          terdengar aneh.
        </p>
      )}

      <div className="live-isi" aria-live="polite" aria-atomic="true">
        {terbaru ? (
          <>
            <p className="catatan">Hasil deteksi terakhir:</p>
            <h1 className="live-teks">{terbaru.teks}</h1>
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
              Teks akan muncul di sini saat sarung tangan mendeteksi isyarat.
            </p>
          </>
        )}
      </div>

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
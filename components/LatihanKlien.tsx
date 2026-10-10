"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseClient";
import {
  AWAL,
  DETIK_TIME_ATTACK,
  KATA_PER_RONDE_EJA,
  acakAntrean,
  bacaProgres,
  bangunLevel,
  hitungBintang,
  kataEjaTersedia,
  kocok,
  namaLevel,
  progresKosong,
  reduksi,
  simpanProgres,
  type Kata,
  type Progres,
} from "@/lib/latihan";

const bintangTeks = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);

export default function LatihanKlien({ kata }: { kata: Kata[] }) {
  const [g, kirim] = useReducer(reduksi, AWAL);
  const [progres, setProgres] = useState<Progres>(progresKosong);
  const [isAdmin, setIsAdmin] = useState(false);
  const pertama = useRef(true);
  const disimpan = useRef(false);

  const level = useMemo(() => bangunLevel(kata), [kata]);
  const kamusEja = useMemo(() => kataEjaTersedia(kata), [kata]);
  const hurufMap = useMemo(() => {
    const m = new Map<string, Kata>();
    for (const k of kata) {
      if (k.kategori !== "huruf") continue;
      const t = k.teks.trim().toUpperCase();
      if (/^[A-Z]$/.test(t)) m.set(t, k);
    }
    return m;
  }, [kata]);

  // Muat progres dari browser
  useEffect(() => {
    setProgres(bacaProgres());
  }, []);

  // Apakah pengunjung ini admin? (untuk panel uji)
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        return;
      }
      const r = await u.getIdTokenResult();
      setIsAdmin(r.claims.admin === true);
    });
  }, []);

  // Dengarkan event baru dari sarung tangan (atau simulator)
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("waktu", "desc"), limit(5));
    return onSnapshot(
      q,
      (snap) => {
        // Isi awal diabaikan, hanya event yang datang SETELAH halaman dibuka
        if (pertama.current) {
          pertama.current = false;
          return;
        }
        snap
          .docChanges()
          .filter((c) => c.type === "added")
          .map((c) => {
            const x = c.doc.data();
            return {
              sign_id: String(x.sign_id ?? ""),
              teks: String(x.teks ?? ""),
              skor: typeof x.skor === "number" ? x.skor : null,
              ms: x.waktu?.toMillis?.() ?? Date.now(),
            };
          })
          .sort((a, b) => a.ms - b.ms)
          .forEach((e) =>
            kirim({
              tipe: "event",
              e: { sign_id: e.sign_id, teks: e.teks, skor: e.skor },
              sekarang: Date.now(),
            })
          );
      },
      () => {}
    );
  }, []);

  // Detak waktu tiap detik selama permainan berjalan
  useEffect(() => {
    if (g.fase !== "main") return;
    const t = setInterval(() => kirim({ tipe: "tick", sekarang: Date.now() }), 1000);
    return () => clearInterval(t);
  }, [g.fase]);

  // Simpan progres saat permainan selesai
  useEffect(() => {
    if (g.fase === "main") disimpan.current = false;
    if (g.fase !== "selesai" || disimpan.current) return;
    disimpan.current = true;

    const p = bacaProgres();
    if (g.mode === "level") {
      const bintang = hitungBintang(g.benar, g.antrean.length);
      const kunci = String(g.levelIdx);
      const lama = p.level[kunci];
      p.level[kunci] = {
        bintang: Math.max(lama?.bintang ?? 0, bintang),
        poin: Math.max(lama?.poin ?? 0, g.poin),
      };
    } else if (g.mode === "time") {
      p.timeAttack = Math.max(p.timeAttack, g.poin);
    } else if (g.mode === "eja") {
      p.eja = Math.max(p.eja, g.poin);
    }
    simpanProgres(p);
    setProgres(p);
  }, [g]);

  function mulaiLevel(i: number) {
    kirim({
      tipe: "mulai",
      mode: "level",
      levelIdx: i,
      antrean: kocok(level[i]),
      sekarang: Date.now(),
    });
  }
  function mulaiTime() {
    kirim({
      tipe: "mulai",
      mode: "time",
      antrean: acakAntrean(kata, 100),
      sekarang: Date.now(),
    });
  }
  function mulaiEja() {
    kirim({
      tipe: "mulai",
      mode: "eja",
      antreanEja: kocok(kamusEja).slice(0, KATA_PER_RONDE_EJA),
      kamusEja,
      sekarang: Date.now(),
    });
  }
  function ulangi() {
    if (g.mode === "level") mulaiLevel(g.levelIdx);
    else if (g.mode === "time") mulaiTime();
    else if (g.mode === "eja") mulaiEja();
  }

  const terbuka = (i: number) =>
    i === 0 || (progres.level[String(i - 1)]?.bintang ?? 0) >= 1;

  /* ---------- Panel uji (hanya admin) ---------- */

  async function simulasi(signId: string) {
    const token = await auth.currentUser?.getIdToken();
    await fetch("/api/admin/simulate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sign_id: signId }),
    }).catch(() => {});
  }

  function ujiBenar() {
    if (g.mode === "eja") {
      const huruf = g.antreanEja[g.pos]?.[g.terkumpul.length];
      const sign = huruf ? hurufMap.get(huruf) : undefined;
      if (sign) simulasi(sign.id);
    } else {
      const t = g.antrean[g.pos];
      if (t) simulasi(t.id);
    }
  }

  function ujiSalah() {
    let lain: Kata[];
    if (g.mode === "eja") {
      const benar = g.antreanEja[g.pos]?.[g.terkumpul.length];
      lain = [...hurufMap.entries()].filter(([h]) => h !== benar).map(([, k]) => k);
    } else {
      const t = g.antrean[g.pos];
      lain = kata.filter((k) => k.id !== t?.id);
    }
    const k = lain[Math.floor(Math.random() * lain.length)];
    if (k) simulasi(k.id);
  }

  const panelUji = isAdmin && g.fase === "main" && (
    <section className="panel-uji">
      <strong>Panel uji (hanya terlihat admin)</strong>
      <p className="catatan">
        Mensimulasikan kiriman dari sarung tangan, supaya bisa dites tanpa perangkat.
      </p>
      <div className="live-bar">
        <button onClick={ujiBenar}>
          {g.mode === "eja" ? "Kirim huruf benar berikutnya" : "Kirim jawaban benar"}
        </button>
        <button onClick={ujiSalah}>
          {g.mode === "eja" ? "Kirim huruf salah" : "Kirim jawaban salah"}
        </button>
      </div>
    </section>
  );

  /* ---------- Layar: menu ---------- */

  if (kata.length === 0) {
    return (
      <div className="kartu">
        <p>
          Belum ada isyarat yang siap dilatih. Tambahkan kata di admin dan rekam polanya
          lewat Mode Rekam.
        </p>
      </div>
    );
  }

  if (g.fase === "menu") {
    return (
      <>
        <p style={{ color: "var(--redup)" }}>
          Pakai sarung tangan, lalu peragakan isyarat yang diminta. Setiap isyarat yang
          dikenali akan dibaca di halaman ini. Progresmu tersimpan di browser ini.
        </p>

        <h2>Level</h2>
        <div className="grid3">
          {level.map((l, i) => {
            const b = progres.level[String(i)]?.bintang ?? 0;
            const buka = terbuka(i);
            return (
              <div key={i} className="kartu">
                <h3>{namaLevel(l, i)}</h3>
                <p>
                  {l.length} isyarat · <span className="bintang">{bintangTeks(b)}</span>
                </p>
                <button className="kartu-aksi" disabled={!buka} onClick={() => mulaiLevel(i)}>
                  {buka ? "Mulai" : "Terkunci"}
                </button>
              </div>
            );
          })}
        </div>

        <h2>Mode lain</h2>
        <div className="grid3">
          <div className="kartu">
            <h3>Time Attack</h3>
            <p>
              Peragakan sebanyak mungkin isyarat dalam {DETIK_TIME_ATTACK} detik. Rekor:{" "}
              {progres.timeAttack} poin.
            </p>
            <button className="kartu-aksi" onClick={mulaiTime}>
              Mulai
            </button>
          </div>
          <div className="kartu">
            <h3>Eja Kata</h3>
            {kamusEja.length >= 3 ? (
              <>
                <p>
                  Eja {KATA_PER_RONDE_EJA} kata huruf demi huruf. Huruf yang salah baca
                  dikoreksi otomatis. Rekor: {progres.eja} poin.
                </p>
                <button className="kartu-aksi" onClick={mulaiEja}>
                  Mulai
                </button>
              </>
            ) : (
              <p>
                Belum cukup huruf. Daftarkan isyarat huruf (kategori Huruf, teks satu huruf,
                mis. A, B, I, K, R, U) agar kata bisa dieja.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  /* ---------- Layar: selesai ---------- */

  if (g.fase === "selesai") {
    const total = g.mode === "eja" ? g.antreanEja.length : g.antrean.length;
    const bintang = g.mode === "level" ? hitungBintang(g.benar, total) : 0;
    const bisaLanjut =
      g.mode === "level" && bintang >= 1 && g.levelIdx + 1 < level.length;

    return (
      <section className="kartu latih">
        <h2>{g.mode === "time" ? "Waktu habis!" : "Selesai!"}</h2>
        <p>
          Total poin: <strong>{g.poin}</strong>
        </p>
        {g.mode === "level" && (
          <>
            <p>
              Benar {g.benar} dari {total} isyarat.
            </p>
            <p className="bintang">{bintangTeks(bintang)}</p>
            {bintang === 0 && (
              <p className="catatan">
                Butuh minimal 60% benar untuk membuka level berikutnya.
              </p>
            )}
          </>
        )}
        {g.mode === "time" && (
          <p>
            {g.benar} isyarat benar. Rekor tertinggimu: {progres.timeAttack} poin.
          </p>
        )}
        {g.mode === "eja" && (
          <p>
            {g.benar} dari {total} kata terbaca tepat. Rekor: {progres.eja} poin.
          </p>
        )}
        {g.umpan && <p className={`umpan ${g.umpan.jenis}`}>{g.umpan.teks}</p>}
        <div className="live-bar">
          <button onClick={ulangi}>Main lagi</button>
          {bisaLanjut && (
            <button onClick={() => mulaiLevel(g.levelIdx + 1)}>Level berikutnya</button>
          )}
          <button onClick={() => kirim({ tipe: "keluar" })}>Kembali ke menu</button>
        </div>
      </section>
    );
  }

  /* ---------- Layar: bermain ---------- */

  const total = g.mode === "eja" ? g.antreanEja.length : g.antrean.length;
  const targetTeks =
    g.mode === "eja" ? g.antreanEja[g.pos] : g.antrean[g.pos]?.teks;

  return (
    <>
      <div className="latih">
        <div className="latih-bar">
          <span>
            Poin: <strong>{g.poin}</strong>
          </span>
          <span>
            {g.mode === "time" ? "Sisa waktu" : "Waktu"}: <strong>{g.sisaDetik} dtk</strong>
          </span>
          {g.mode !== "time" && (
            <span>
              Target {Math.min(g.pos + 1, total)}/{total}
            </span>
          )}
          <button onClick={() => kirim({ tipe: "keluar" })}>Berhenti</button>
        </div>

        {g.mode === "time" && (
          <div className="skor-bar">
            <div style={{ width: `${(g.sisaDetik / DETIK_TIME_ATTACK) * 100}%` }} />
          </div>
        )}

        <p className="catatan">
          {g.mode === "eja" ? "Eja kata ini huruf demi huruf:" : "Peragakan isyarat ini:"}
        </p>
        <h1 className="latih-target">{targetTeks}</h1>

        {g.mode === "eja" && targetTeks && (
          <div className="slots">
            {[...targetTeks].map((_, i) => (
              <span key={i} className="slot">
                {g.terkumpul[i] ?? "_"}
              </span>
            ))}
          </div>
        )}

        {g.umpan && <p className={`umpan ${g.umpan.jenis}`}>{g.umpan.teks}</p>}

        <div className="live-bar">
          {g.mode === "eja" && (
            <>
              <button onClick={() => kirim({ tipe: "hapusHuruf" })}>Hapus huruf terakhir</button>
              <button onClick={() => kirim({ tipe: "selesaiKata", sekarang: Date.now() })}>
                Selesai
              </button>
            </>
          )}
          <button onClick={() => kirim({ tipe: "lewati", sekarang: Date.now() })}>Lewati</button>
        </div>
      </div>
      {panelUji}
    </>
  );
}
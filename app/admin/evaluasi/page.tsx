"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useAdmin } from "@/lib/useAdmin";
import {
  DETIK_UJI,
  SESI_AWAL,
  buatAntrean,
  reduksiSesi,
  type Trial,
} from "@/lib/evaluasi";

type Sign = {
  id: string;
  nama_isyarat: string;
  teks_output: string;
  aktif: boolean;
  punya_rule: boolean;
};

type Tersimpan = {
  id: string;
  penguji: string;
  kondisi: string;
  simulasi: boolean;
  versiRuleset: number;
  waktu: number;
  jumlah: number;
  benar: number;
  trials?: Trial[];
};

const csv = (v: string | number | null | boolean) =>
  `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function EvaluasiAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [s, kirim] = useReducer(reduksiSesi, SESI_AWAL);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [ulangan, setUlangan] = useState(10);
  const [penguji, setPenguji] = useState("P1");
  const [kondisi, setKondisi] = useState("");
  const [tersimpan, setTersimpan] = useState<Tersimpan[]>([]);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muatSesi = useCallback(async () => {
    const d = await api("/api/admin/evaluasi");
    setTersimpan(d.sesi);
  }, [api]);

  useEffect(() => {
    if (!isAdmin) return;
    api("/api/admin/signs")
      .then((d) => {
        const siap = (d.signs as Sign[]).filter((x) => x.aktif && x.punya_rule);
        setSigns(siap);
        setPilih(new Set(siap.map((x) => x.id)));
      })
      .catch((e) => setPesan(e.message));
    muatSesi().catch((e) => setPesan(e.message));
  }, [isAdmin, api, muatSesi]);

  // Dengarkan event dari sarung tangan (atau simulator). Isi awal diabaikan.
  useEffect(() => {
    if (!isAdmin) return;
    let pertama = true;
    const q = query(collection(db, "events"), orderBy("waktu", "desc"), limit(5));
    return onSnapshot(
      q,
      (snap) => {
        if (pertama) {
          pertama = false;
          return;
        }
        snap
          .docChanges()
          .filter((c) => c.type === "added")
          .map((c) => {
            const x = c.doc.data();
            return {
              sign_id: String(x.sign_id ?? ""),
              skor: typeof x.skor === "number" ? x.skor : null,
              simulasi: x.device_id === "simulator",
              ms: x.waktu?.toMillis?.() ?? Date.now(),
            };
          })
          .sort((a, b) => a.ms - b.ms)
          .forEach((e) =>
            kirim({
              tipe: "event",
              sign_id: e.sign_id,
              skor: e.skor,
              simulasi: e.simulasi,
              sekarang: Date.now(),
            })
          );
      },
      () => {}
    );
  }, [isAdmin]);

  // Detak waktu tiap detik selama sesi berjalan
  useEffect(() => {
    if (s.fase !== "uji" && s.fase !== "jeda") return;
    const t = setInterval(() => kirim({ tipe: "tick", sekarang: Date.now() }), 1000);
    return () => clearInterval(t);
  }, [s.fase]);

  const nama = (id: string | null) =>
    id === null ? "tidak terdeteksi" : (signs.find((x) => x.id === id)?.teks_output ?? id);

  async function jalankan(aksi: () => Promise<string | void>) {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      const hasil = await aksi();
      if (hasil) setPesan(hasil);
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  function mulai() {
    const ids = [...pilih];
    if (ids.length === 0) {
      setPesan("Pilih minimal satu isyarat.");
      return;
    }
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(penguji)) {
      setPesan("Kode penguji hanya huruf, angka, minus, atau garis bawah (maks. 20), misalnya P1. Jangan memakai nama asli.");
      return;
    }
    setPesan("");
    kirim({ tipe: "mulai", antrean: buatAntrean(ids, ulangan), sekarang: Date.now() });
  }

  function simpan() {
    return jalankan(async () => {
      await api("/api/admin/evaluasi", "POST", {
        penguji,
        kondisi,
        simulasi: s.simulasi,
        trials: s.trials,
      });
      kirim({ tipe: "batal" });
      await muatSesi();
      return "Sesi tersimpan.";
    });
  }

  function hapusSesi(t: Tersimpan) {
    if (!confirm(`Hapus sesi ${t.penguji} (${t.jumlah} percobaan)?`)) return;
    return jalankan(async () => {
      await api("/api/admin/evaluasi", "DELETE", { id: t.id });
      await muatSesi();
      return "Sesi dihapus.";
    });
  }

  function unduhCsv() {
    return jalankan(async () => {
      const d = await api("/api/admin/evaluasi?semua=1");
      const baris = ["sesi,tanggal,penguji,kondisi,simulasi,versi_ruleset,target,hasil,skor,ms"];
      for (const t of d.sesi as Tersimpan[]) {
        for (const x of t.trials ?? []) {
          baris.push(
            [
              csv(t.id),
              csv(t.waktu ? new Date(t.waktu).toISOString() : ""),
              csv(t.penguji),
              csv(t.kondisi),
              csv(t.simulasi),
              csv(t.versiRuleset),
              csv(x.target),
              csv(x.hasil),
              csv(x.skor),
              csv(x.ms),
            ].join(",")
          );
        }
      }
      const blob = new Blob([baris.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluasi-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return "CSV diunduh.";
    });
  }

  // Panel uji: mensimulasikan kiriman dari sarung tangan
  async function simulasi(signId: string) {
    const token = await auth.currentUser?.getIdToken();
    await fetch("/api/admin/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sign_id: signId }),
    }).catch(() => {});
  }
  function ujiBenar() {
    const t = s.antrean[s.pos];
    if (t) simulasi(t);
  }
  function ujiSalah() {
    const t = s.antrean[s.pos];
    const lain = [...pilih].filter((id) => id !== t);
    const k = lain[Math.floor(Math.random() * lain.length)];
    if (k) simulasi(k);
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  const total = s.antrean.length;
  const benar = s.trials.filter((t) => t.hasil === t.target).length;
  const terakhir = s.trials[s.trials.length - 1];

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Mode Evaluasi</h1>
      <p style={{ color: "var(--redup)" }}>
        Penguji memperagakan isyarat yang ditampilkan, dan deteksi pertama dalam {DETIK_UJI} detik
        dicatat sebagai hasil. Pastikan penguji setuju datanya dipakai, dan pakai kode anonim
        (P1, P2), bukan nama. Hanya isyarat yang sudah punya rule yang bisa diuji.
      </p>
      {pesan && <p>{pesan}</p>}

      {s.fase === "idle" && (
        <section className="kartu" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Sesi baru</h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <label>
              Kode penguji{" "}
              <input
                value={penguji}
                maxLength={20}
                style={{ width: 90 }}
                onChange={(e) => setPenguji(e.target.value)}
              />
            </label>
            <label>
              Ulangan per isyarat{" "}
              <input
                type="number"
                min={3}
                max={30}
                value={ulangan}
                style={{ width: 80 }}
                onChange={(e) => setUlangan(Math.min(30, Math.max(3, Number(e.target.value) || 3)))}
              />
            </label>
          </div>
          <input
            placeholder="Kondisi uji (mis. ruang terang, sarung tangan baru dikalibrasi)"
            maxLength={200}
            value={kondisi}
            onChange={(e) => setKondisi(e.target.value)}
          />

          <div>
            <strong>Isyarat yang diuji ({pilih.size}/{signs.length})</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", marginTop: "0.5rem" }}>
              {signs.map((x) => (
                <label key={x.id} style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={pilih.has(x.id)}
                    onChange={(e) => {
                      const baru = new Set(pilih);
                      if (e.target.checked) baru.add(x.id);
                      else baru.delete(x.id);
                      setPilih(baru);
                    }}
                  />
                  {x.teks_output}
                </label>
              ))}
              {signs.length === 0 && (
                <span style={{ color: "var(--redup)" }}>
                  Belum ada isyarat yang punya rule. Rekam polanya lewat Mode Rekam.
                </span>
              )}
            </div>
          </div>
          <div>
            <button onClick={mulai} disabled={sibuk || pilih.size === 0}>
              Mulai sesi ({pilih.size * ulangan} percobaan)
            </button>
          </div>
        </section>
      )}

      {(s.fase === "uji" || s.fase === "jeda") && (
        <section className="latih">
          <div className="latih-bar">
            <span>
              Percobaan <strong>{s.pos + 1}</strong>/{total}
            </span>
            <span>
              {s.fase === "uji" ? "Waktu" : "Jeda"}: <strong>{s.sisa} dtk</strong>
            </span>
            <button onClick={() => kirim({ tipe: "batal" })}>Batalkan sesi</button>
          </div>

          {s.fase === "uji" ? (
            <>
              <p className="catatan">Peragakan isyarat ini:</p>
              <h2 className="latih-target">{nama(s.antrean[s.pos])}</h2>
            </>
          ) : (
            <>
              <p className="catatan">Lepaskan pose. Percobaan berikutnya segera dimulai.</p>
              <h2 className="latih-target">...</h2>
            </>
          )}

          {terakhir && (
            <p className={`umpan ${terakhir.hasil === terakhir.target ? "benar" : "salah"}`}>
              Percobaan sebelumnya: target &quot;{nama(terakhir.target)}&quot;, terdeteksi{" "}
              &quot;{nama(terakhir.hasil)}&quot;
              {terakhir.skor !== null ? ` (kecocokan ${terakhir.skor}%)` : ""}
            </p>
          )}

          <div className="panel-uji">
            <strong>Panel uji (simulator)</strong>
            <p className="catatan">
              Sesi yang memakai tombol ini otomatis ditandai simulasi dan tidak ikut statistik
              publik.
            </p>
            <div className="live-bar">
              <button onClick={ujiBenar} disabled={s.fase !== "uji"}>
                Kirim deteksi benar
              </button>
              <button onClick={ujiSalah} disabled={s.fase !== "uji"}>
                Kirim deteksi salah
              </button>
            </div>
          </div>
        </section>
      )}

      {s.fase === "selesai" && (
        <section className="kartu" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Sesi selesai</h2>
          <p style={{ margin: 0 }}>
            Benar {benar} dari {s.trials.length} percobaan (
            {s.trials.length ? Math.round((benar / s.trials.length) * 100) : 0}%). Tidak terdeteksi:{" "}
            {s.trials.filter((t) => t.hasil === null).length}.
          </p>
          {s.simulasi && (
            <p style={{ margin: 0, color: "#ffb84d" }}>
              Sesi ini memuat event dari simulator, jadi akan ditandai simulasi dan tidak masuk
              statistik publik.
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={simpan} disabled={sibuk}>
              {sibuk ? "Menyimpan..." : "Simpan sesi"}
            </button>
            <button onClick={() => kirim({ tipe: "batal" })} disabled={sibuk}>
              Buang sesi
            </button>
          </div>
        </section>
      )}

      <section style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Sesi tersimpan</h2>
          <button onClick={unduhCsv} disabled={sibuk}>
            Unduh semua (CSV)
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
          {tersimpan.length === 0 && (
            <li style={{ color: "var(--redup)" }}>Belum ada sesi.</li>
          )}
          {tersimpan.map((t) => (
            <li
              key={t.id}
              className="kartu"
              style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}
            >
              <span>
                <strong>{t.penguji}</strong> · {t.benar}/{t.jumlah} benar
                {t.simulasi ? " · simulasi" : ""}
                <br />
                <span style={{ color: "var(--redup)", fontSize: "0.85rem" }}>
                  {t.waktu ? new Date(t.waktu).toLocaleString("id-ID") : "-"} · ruleset v
                  {t.versiRuleset}
                  {t.kondisi ? ` · ${t.kondisi}` : ""}
                </span>
              </span>
              <button onClick={() => hapusSesi(t)} disabled={sibuk}>
                Hapus
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
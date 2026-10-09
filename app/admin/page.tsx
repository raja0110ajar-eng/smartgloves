"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";

type Sign = {
  id: string;
  nama_isyarat: string;
  teks_output: string;
  aktif: boolean;
  audio_url?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [nama, setNama] = useState("");
  const [teks, setTeks] = useState("");
  const [pesan, setPesan] = useState("");

  const api = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `gagal (HTTP ${res.status})`);
      return data;
    },
    []
  );

  const muat = useCallback(async () => {
    const data = await api("/api/admin/signs");
    setSigns(data.signs);
  }, [api]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const r = await u.getIdTokenResult(true);
      setIsAdmin(r.claims.admin === true);
      setReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (isAdmin) muat().catch((e) => setPesan(e.message));
  }, [isAdmin, muat]);

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/admin/signs", "POST", {
        nama_isyarat: nama,
        teks_output: teks,
      });
      setNama("");
      setTeks("");
      setPesan("Kata ditambahkan.");
      await muat();
    } catch (err) {
      setPesan((err as Error).message);
    }
  }

  async function ubahAktif(s: Sign) {
    await api("/api/admin/signs", "PATCH", { id: s.id, aktif: !s.aktif });
    await muat();
  }

  async function simulasi(s: Sign) {
    try {
      await api("/api/admin/simulate", "POST", { sign_id: s.id });
      setPesan(`Terkirim: ${s.teks_output}`);
    } catch (err) {
      setPesan((err as Error).message);
    }
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Akun ini bukan admin.</p>
        <button onClick={() => signOut(auth).then(() => router.replace("/login"))}>
          Keluar
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui", padding: "0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Admin SmartGloves</h1>
        <button onClick={() => signOut(auth).then(() => router.replace("/login"))}>
          Keluar
        </button>
      </div>

      <form onSubmit={tambah} style={{ display: "grid", gap: "0.5rem", margin: "1rem 0" }}>
        <input
          placeholder="Nama isyarat (mis. Halo)"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
        />
        <input
          placeholder="Teks yang tampil (mis. Halo)"
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          required
        />
        <button type="submit">Tambah kata</button>
      </form>
      <p><a href="/admin/rekam">Buka Mode Rekam →</a></p>
      <p><a href="/admin/ai">Buka Asisten AI →</a></p>

      {pesan && <p>{pesan}</p>}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
        {signs.map((s) => (
          <li
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
              opacity: s.aktif ? 1 : 0.4,
            }}
          >
            <span>
              {s.nama_isyarat} → {s.teks_output}
            </span>
            <span style={{ display: "flex", gap: "0.5rem" }}>
              {s.audio_url && (
                <button onClick={() => new Audio(s.audio_url).play()}>Putar</button>
              )}
              {s.aktif && <button onClick={() => simulasi(s)}>Simulasikan</button>}
              <button onClick={() => ubahAktif(s)}>
                {s.aktif ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
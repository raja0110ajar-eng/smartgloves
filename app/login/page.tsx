"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

function kodeGalat(e: unknown) {
  return (e as { code?: string })?.code ?? "";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ingat, setIngat] = useState(false);
  const [lihat, setLihat] = useState(false);
  const [pesan, setPesan] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  // Kalau sudah login, langsung ke admin
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
     if (u) router.replace("/admin/ringkasan");
    });
  }, [router]);

  // Pesan kalau sebelumnya keluar otomatis karena tidak aktif
  useEffect(() => {
    try {
      if (sessionStorage.getItem("sesi-habis")) {
        sessionStorage.removeItem("sesi-habis");
        setPesan("Sesi berakhir karena tidak ada aktivitas. Silakan masuk lagi.");
      }
    } catch {
      /* abaikan */
    }
  }, []);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    if (sibuk) return;
    setSibuk(true);
    setGalat("");
    setPesan("");
    try {
      // Tanpa "Ingat saya": login hanya berlaku di tab ini dan hilang saat ditutup
      await setPersistence(
        auth,
        ingat ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Kosongkan isian. Perpindahan ke /admin dilakukan oleh pemantau login di atas.
      setEmail("");
      setPassword("");
    } catch (err) {
      const kode = kodeGalat(err);
      if (kode === "auth/too-many-requests") {
        setGalat("Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.");
      } else if (kode === "auth/network-request-failed") {
        setGalat("Koneksi bermasalah. Periksa sinyal lalu coba lagi.");
      } else {
        setGalat("Email atau password salah.");
      }
      setPassword("");
    } finally {
      setSibuk(false);
    }
  }

  async function lupa() {
    setGalat("");
    setPesan("");
    if (!email.trim()) {
      setGalat("Isi emailnya dulu, lalu klik Lupa password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const kode = kodeGalat(err);
      if (kode === "auth/invalid-email") {
        setGalat("Format email tidak valid.");
        return;
      }
      if (kode === "auth/network-request-failed") {
        setGalat("Koneksi bermasalah. Periksa sinyal lalu coba lagi.");
        return;
      }
      // Kode lain sengaja diabaikan supaya tidak membocorkan email mana yang terdaftar
    }
    setPesan(
      "Kalau email itu terdaftar, tautan untuk mengatur ulang password sudah dikirim. Periksa juga folder spam."
    );
  }

  return (
    <main className="login">
      <Link href="/">← Kembali ke beranda</Link>
      <h1 style={{ margin: 0 }}>Login Admin</h1>

      <form onSubmit={masuk} className="login-form">
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Password
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type={lihat ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ flex: 1, minWidth: 0 }}
            />
            <button type="button" onClick={() => setLihat(!lihat)}>
              {lihat ? "Sembunyikan" : "Lihat"}
            </button>
          </div>
        </label>

        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={ingat}
            onChange={(e) => setIngat(e.target.checked)}
          />
          Ingat saya di perangkat ini
        </label>
        <p className="catatan">
          Biarkan tidak dicentang di komputer bersama. Login lalu hanya berlaku di tab ini.
        </p>

        <button type="submit" disabled={sibuk}>
          {sibuk ? "Memproses..." : "Masuk"}
        </button>

        {galat && <p style={{ color: "#ff8a8a", margin: 0 }}>{galat}</p>}
        {pesan && <p style={{ margin: 0 }}>{pesan}</p>}

        <button type="button" onClick={lupa} className="tautan-tombol">
          Lupa password?
        </button>
      </form>
    </main>
  );
}
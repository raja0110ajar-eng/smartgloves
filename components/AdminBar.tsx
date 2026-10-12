"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import TampilanMenu from "./TampilanMenu";

// Keluar otomatis kalau tidak ada aktivitas selama ini
const BATAS_IDLE_MENIT = 30;

const MENU = [
  { href: "/admin/ringkasan", label: "Ringkasan" },
  { href: "/admin", label: "Kata" },
  { href: "/admin/rekam", label: "Rekam" },
  { href: "/admin/evaluasi", label: "Evaluasi" },
  { href: "/admin/perangkat", label: "Perangkat" },
  { href: "/admin/audio", label: "Audio" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/halaman", label: "Halaman" },
  { href: "/admin/ticker", label: "Teks berjalan" },
  { href: "/admin/ai", label: "AI" },
  { href: "/admin/ai/status", label: "Status AI" },
  { href: "/admin/cadangan", label: "Cadangan" },
  { href: "/admin/log", label: "Aktivitas" },
];
export default function AdminBar() {
  const path = usePathname();
  const router = useRouter();
  const terakhir = useRef(Date.now());
  const masuk = useRef(false);

  // Pantau apakah ada yang sedang login
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      masuk.current = !!u;
      if (u) terakhir.current = Date.now();
    });
  }, []);

  // Catat aktivitas, dan periksa tiap 30 detik apakah sudah terlalu lama diam
  useEffect(() => {
    const tandai = () => {
      terakhir.current = Date.now();
    };
    const acara = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    acara.forEach((a) => window.addEventListener(a, tandai, { passive: true }));

    const cek = setInterval(() => {
      if (masuk.current && Date.now() - terakhir.current > BATAS_IDLE_MENIT * 60_000) {
        masuk.current = false;
        try {
          sessionStorage.setItem("sesi-habis", "1");
        } catch {
          /* abaikan */
        }
        signOut(auth).finally(() => router.replace("/login"));
      }
    }, 30_000);

    return () => {
      acara.forEach((a) => window.removeEventListener(a, tandai));
      clearInterval(cek);
    };
  }, [router]);

  async function keluar() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <header className="adminbar">
      <div className="adminbar-isi">
        <Link href="/" className="adminbar-kembali">
          ← Situs publik
        </Link>
        <nav className="adminbar-menu">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              aria-current={path === m.href ? "page" : undefined}
            >
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="adminbar-kanan">
          <TampilanMenu />
          <button onClick={keluar}>Keluar</button>
        </div>
      </div>
    </header>
  );
}
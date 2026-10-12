"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, House, Menu, MessageCircle, Radio, Target, X } from "lucide-react";
import Logo from "./Logo";
import TampilanMenu from "./TampilanMenu";
import TeksBerjalan from "./TeksBerjalan";
import type { Ticker } from "@/lib/tickerAturan";

type Item = { href: string; label: string };

const NAV: Item[] = [
  { href: "/live", label: "Demo Live" },
  { href: "/latihan", label: "Latihan" },
  { href: "/kamus", label: "Kamus" },
  { href: "/tanya", label: "Tanya" },
];

const INFO_TETAP: Item[] = [
  { href: "/pengujian", label: "Pengujian" },
  { href: "/privasi", label: "Privasi" },
];

const TAB = [
  { href: "/", label: "Beranda", Ikon: House },
  { href: "/live", label: "Demo", Ikon: Radio },
  { href: "/latihan", label: "Latihan", Ikon: Target },
  { href: "/kamus", label: "Kamus", Ikon: BookOpen },
];

const cocok = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

function Informasi({ item, path }: { item: Item[]; path: string }) {
  const [buka, setBuka] = useState(false);
  const aktif = item.some((i) => cocok(path, i.href));

  useEffect(() => {
    if (!buka) return;
    const klik = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".turun")) setBuka(false);
    };
    const tombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", tombol);
    };
  }, [buka]);

  return (
    <div className="turun">
      <button
        type="button"
        className="nav-tombol"
        aria-expanded={buka}
        aria-haspopup="true"
        data-aktif={aktif || undefined}
        onClick={() => setBuka(!buka)}
      >
        Informasi
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {buka && (
        <div className="turun-isi">
          {item.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={cocok(path, i.href) ? "page" : undefined}
              onClick={() => setBuka(false)}
            >
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SiteChrome({
  children,
  menuHalaman = [],
  ticker,
}: {
  children: React.ReactNode;
  menuHalaman?: Item[];
  ticker: Ticker;
}) {
  const path = usePathname();
  const [lembar, setLembar] = useState(false);

  useEffect(() => {
    if (!lembar) return;
    const tombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLembar(false);
    };
    document.addEventListener("keydown", tombol);
    return () => document.removeEventListener("keydown", tombol);
  }, [lembar]);

  if (path.startsWith("/admin") || path.startsWith("/login")) {
    return <>{children}</>;
  }

  const informasi: Item[] = [...menuHalaman, ...INFO_TETAP];

  return (
    <>
      <a href="#isi" className="lewati">
        Lewati ke konten
      </a>

      <header className="kepala">
        <div className="kepala-isi">
          <Link href="/" className="merek" aria-label="SmartGloves oleh Karsa Pandiga, ke beranda">
            <Logo tinggi={36} />
            <span className="merek-teks">
              <strong>SmartGloves</strong>
              <small>Karsa Pandiga</small>
            </span>
          </Link>

          <nav className="nav-utama" aria-label="Menu utama">
            {NAV.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                aria-current={cocok(path, m.href) ? "page" : undefined}
              >
                {m.label}
              </Link>
            ))}
            <Informasi item={informasi} path={path} />
          </nav>

          <div className="kepala-kanan">
            <TampilanMenu />
          </div>
        </div>
      </header>

      {ticker.aktif && <TeksBerjalan pesan={ticker.pesan} />}

      <div id="isi" tabIndex={-1}>
        {children}
      </div>

      <footer className="kaki">
        <div className="kontainer kaki-isi">
          <div className="kaki-merek">
            <Logo tinggi={52} />
            <p>
              <strong>SmartGloves</strong>
              <br />
              Dikembangkan oleh Karsa Pandiga.
              <br />
              Prototipe edukasi untuk isyarat SIBI.
            </p>
          </div>
          <nav aria-label="Jelajahi">
            <h2 className="kaki-judul">Jelajahi</h2>
            <ul className="kaki-daftar">
              {NAV.map((m) => (
                <li key={m.href}>
                  <Link href={m.href}>{m.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Informasi">
            <h2 className="kaki-judul">Informasi</h2>
            <ul className="kaki-daftar">
              {informasi.map((m) => (
                <li key={m.href}>
                  <Link href={m.href}>{m.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="kontainer kaki-bawah">
          <span>© {new Date().getFullYear()} Karsa Pandiga</span>
          <Link href="/login">Masuk admin</Link>
        </div>
      </footer>

      {lembar && (
        <>
          <button
            type="button"
            className="lembar-latar"
            aria-label="Tutup menu"
            onClick={() => setLembar(false)}
          />
          <div className="lembar" role="region" aria-label="Menu lainnya">
            <ul className="lembar-daftar">
              <li>
                <Link
                  href="/tanya"
                  aria-current={cocok(path, "/tanya") ? "page" : undefined}
                  onClick={() => setLembar(false)}
                >
                  <MessageCircle size={18} aria-hidden="true" />
                  Tanya SmartGloves
                </Link>
              </li>
              {informasi.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    aria-current={cocok(path, m.href) ? "page" : undefined}
                    onClick={() => setLembar(false)}
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="lembar-tampilan">
              <TampilanMenu sebaris />
            </div>
          </div>
        </>
      )}

      <nav className="tab-bawah" aria-label="Menu ponsel">
        {TAB.map(({ href, label, Ikon }) => (
          <Link
            key={href}
            href={href}
            className="tab"
            aria-current={cocok(path, href) ? "page" : undefined}
            onClick={() => setLembar(false)}
          >
            <Ikon size={22} aria-hidden="true" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          className="tab"
          aria-expanded={lembar}
          onClick={() => setLembar(!lembar)}
        >
          {lembar ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          Lainnya
        </button>
      </nav>
    </>
  );
}
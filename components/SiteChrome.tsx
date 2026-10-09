"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import TemaToggle from "./TemaToggle";

type Item = { href: string; label: string };

export default function SiteChrome({
  children,
  menuHalaman = [],
}: {
  children: React.ReactNode;
  menuHalaman?: Item[];
}) {
  const path = usePathname();

  if (path.startsWith("/admin") || path.startsWith("/login")) {
    return <>{children}</>;
  }

  const menu: Item[] = [
    { href: "/", label: "Beranda" },
    ...menuHalaman,
    { href: "/kamus", label: "Kamus" },
    { href: "/live", label: "Demo Live" },
  ];

  return (
    <>
      <header className="nav">
        <div className="nav-isi">
          <Link href="/" className="nav-merek">
            SmartGloves
          </Link>
          <nav className="nav-menu">
            {menu.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                aria-current={path === m.href ? "page" : undefined}
              >
                {m.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="footer">
        <div
          className="kontainer"
          style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
        >
          <span>SmartGloves, prototipe penerjemah SIBI.</span>
          <Link href="/login">Admin</Link>
        </div>
      </footer>
    </>
  );
}
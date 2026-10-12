import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { ambilMenu } from "@/lib/halaman";
import { ambilTicker } from "@/lib/ticker";

const lexend = localFont({
  src: '../public/fonts/Lexend-Variable.woff2', // Pastikan jalur relatifnya sesuai menuju folder public
  variable: '--font-lexend',
  weight: '100 900', // Karena tipe Variable, satu file mendukung semua ketebalan
  display: 'swap',
});

const DESKRIPSI =
  "Sarung tangan pintar yang menerjemahkan isyarat tangan SIBI menjadi teks dan suara. Dikembangkan oleh Karsa Pandiga.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://smartgloves.vercel.app"),
  title: "SmartGloves oleh Karsa Pandiga",
  description: DESKRIPSI,
  authors: [{ name: "Karsa Pandiga" }],
  openGraph: {
    title: "SmartGloves oleh Karsa Pandiga",
    description: DESKRIPSI,
    siteName: "SmartGloves",
    locale: "id_ID",
    type: "website",
  },
};

// Tema terang adalah bawaan. Pilihan pengguna (tema, ukuran teks, kontras) diterapkan
// sebelum halaman tampil supaya tidak berkedip.
const SKRIP_TAMPILAN = `try{var d=document.documentElement,t=localStorage.getItem("tema");if(t==="terang"||t==="gelap")d.dataset.tema=t;var u=parseInt(localStorage.getItem("ukuran"),10);if(u>=90&&u<=130)d.style.fontSize=u+"%";if(localStorage.getItem("kontras")==="tinggi")d.dataset.kontras="tinggi"}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [menu, ticker] = await Promise.all([ambilMenu(), ambilTicker()]);
  return (
    <html lang="id" className={lexend.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TAMPILAN }} />
      </head>
      <body>
        <SiteChrome menuHalaman={menu} ticker={ticker}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
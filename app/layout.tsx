import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { ambilMenu } from "@/lib/halaman";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://smartgloves.vercel.app"),
  title: "SmartGloves, penerjemah SIBI",
  description:
    "Sarung tangan pintar yang menerjemahkan isyarat tangan SIBI menjadi teks dan suara.",
  openGraph: {
    title: "SmartGloves, penerjemah SIBI",
    description:
      "Sarung tangan pintar yang menerjemahkan isyarat tangan SIBI menjadi teks dan suara.",
    siteName: "SmartGloves",
    locale: "id_ID",
    type: "website",
  },
};

const SKRIP_TAMPILAN = `try{var d=document.documentElement,t=localStorage.getItem("tema");if(t==="terang"||t==="gelap")d.dataset.tema=t;var u=parseInt(localStorage.getItem("ukuran"),10);if(u>=90&&u<=130)d.style.fontSize=u+"%";if(localStorage.getItem("kontras")==="tinggi")d.dataset.kontras="tinggi"}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const menu = await ambilMenu();
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TAMPILAN }} />
      </head>
      <body>
        <SiteChrome menuHalaman={menu}>{children}</SiteChrome>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { ambilMenu } from "@/lib/halaman";

export const metadata: Metadata = {
  title: "SmartGloves, penerjemah SIBI",
  description:
    "Sarung tangan pintar yang menerjemahkan isyarat tangan SIBI menjadi teks dan suara.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const menu = await ambilMenu();
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("tema");if(t==="terang"||t==="gelap")document.documentElement.dataset.tema=t}catch(e){}`,
          }}
        />
      </head>
      <body>
        <SiteChrome menuHalaman={menu}>{children}</SiteChrome>
      </body>
    </html>
  );
}
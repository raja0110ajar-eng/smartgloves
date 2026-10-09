import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ambilHalaman } from "@/lib/halaman";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const h = await ambilHalaman(slug);
  return { title: h ? `${h.judul}, SmartGloves` : "Halaman tidak ditemukan" };
}

export default async function HalamanPage({ params }: Props) {
  const { slug } = await params;
  const h = await ambilHalaman(slug);
  if (!h) notFound();

  return (
    <main className="kontainer bagian">
      <h1>{h.judul}</h1>
      <div className="markdown">
        <Markdown remarkPlugins={[remarkGfm]}>{h.isi}</Markdown>
      </div>
    </main>
  );
}
import { notFound } from "next/navigation";
import IsiMarkdown from "@/components/IsiMarkdown";
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
        <IsiMarkdown isi={h.isi} />
      </div>
    </main>
  );
}
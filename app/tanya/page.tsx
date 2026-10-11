import TanyaKlien from "@/components/TanyaKlien";

export const metadata = { title: "Tanya SmartGloves" };

export default function TanyaPage() {
  return (
    <main className="kontainer bagian">
      <h1>Tanya SmartGloves</h1>
      <p style={{ color: "var(--redup)" }}>
        Tanyakan apa saja seputar proyek ini, cara kerjanya, dan isyarat yang didukung.
      </p>
      <TanyaKlien />
    </main>
  );
}
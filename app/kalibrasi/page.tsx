import KalibrasiKlien from "@/components/KalibrasiKlien";

export const metadata = { title: "Kalibrasi sensor, SmartGloves" };

export default function KalibrasiPage() {
  return (
    <main className="kontainer bagian">
      <h1>Kalibrasi sensor</h1>
      <p style={{ color: "var(--redup)", maxWidth: "46rem" }}>
        Setiap pemakai punya rentang gerak jari yang berbeda. Saat kalibrasi, sarung tangan membaca
        sensor tekuk ketika jari lurus dan ketika mengepal. Selisih keduanya menentukan seberapa jelas
        sensor membedakan jari lurus dan menekuk.
      </p>
      <KalibrasiKlien />
    </main>
  );
}
import KesanKlien from "@/components/KesanKlien";

export const metadata = { title: "Kesan dan pesan, SmartGloves" };

export default function KesanPage() {
  return (
    <main className="kontainer bagian">
      <h1>Kesan dan pesan</h1>
      <p style={{ color: "var(--redup)", maxWidth: "46rem" }}>
        Tinggalkan kesan, saran, atau pesan setelah mencoba atau melihat SmartGloves. Pesan yang
        disetujui akan tampil di halaman ini.
      </p>
      <KesanKlien />
    </main>
  );
}
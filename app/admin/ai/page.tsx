"use client";

import { useRef, useState } from "react";
import { useAdmin } from "@/lib/useAdmin";

type Usulan = {
  aksi: Record<string, unknown>;
  label: string;
  isi?: string;
  bahaya: boolean;
  pilih: boolean;
};
type Hasil = { target: string; ok: boolean; pesan: string };
type Log = {
  id: string;
  email: string;
  perintah: string;
  waktu: number;
  hasil: (Hasil & { tipe: string })[];
};

export default function AiPage() {
  const { ready, isAdmin, api } = useAdmin();
  const [perintah, setPerintah] = useState("");
  const [usulan, setUsulan] = useState<Usulan[]>([]);
  const [hasil, setHasil] = useState<Hasil[]>([]);
  const [riwayat, setRiwayat] = useState<Log[] | null>(null);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  async function jalankan(aksi: () => Promise<void>) {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      await aksi();
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  function buatUsulan() {
    return jalankan(async () => {
      setPesan("");
      setHasil([]);
      const d = await api("/api/admin/ai/usul", "POST", { perintah });
      setUsulan(
        d.usulan.map((u: Omit<Usulan, "pilih">) => ({ ...u, pilih: !u.bahaya }))
      );
      const catatan = d.dilewati.length ? ` Dilewati: ${d.dilewati.join("; ")}.` : "";
      setPesan(
        d.usulan.length
          ? `Periksa usulan di bawah, lalu terapkan.${catatan}`
          : `AI tidak menemukan aksi yang bisa dilakukan.${catatan}`
      );
    });
  }

  function ubah(i: number, pilih: boolean) {
    setUsulan(usulan.map((u, j) => (j === i ? { ...u, pilih } : u)));
  }

  function terapkan() {
    const dipilih = usulan.filter((u) => u.pilih);
    if (dipilih.length === 0) return;
    if (
      dipilih.some((u) => u.bahaya) &&
      !confirm("Ada aksi HAPUS PERMANEN yang dicentang. Ini tidak bisa dibatalkan. Lanjutkan?")
    ) {
      return;
    }
    return jalankan(async () => {
      const d = await api("/api/admin/ai/terapkan", "POST", {
        perintah,
        aksi: dipilih.map((u) => u.aksi),
      });
      setHasil(d.hasil);
      setUsulan(usulan.filter((u) => !u.pilih));
      setPesan("Selesai. Hasilnya ada di bawah.");
      setRiwayat(null);
    });
  }

  function muatRiwayat() {
    return jalankan(async () => {
      const d = await api("/api/admin/ai/log");
      setRiwayat(d.log);
    });
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  const jumlahDipilih = usulan.filter((u) => u.pilih).length;

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <a href="/admin">← Kembali</a>
      </p>
      <h1>Asisten AI</h1>
      <p style={{ color: "var(--redup)" }}>
        Tulis apa yang mau dilakukan. AI hanya membuat <strong>usulan</strong>, tidak ada yang
        berubah sebelum kamu klik Terapkan. Contoh: &quot;daftarkan kata maaf dan tolong&quot;,
        &quot;ubah teks Halo jadi Halo, selamat datang&quot;, &quot;nonaktifkan kata Ya&quot;,
        &quot;tulis halaman Tentang dari poin-poin berikut: ...&quot;.
      </p>

      <textarea
        rows={5}
        maxLength={4000}
        style={{ width: "100%" }}
        placeholder="Tulis permintaanmu di sini..."
        value={perintah}
        onChange={(e) => setPerintah(e.target.value)}
      />
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={buatUsulan} disabled={sibuk || perintah.trim().length < 2}>
          {sibuk ? "Memproses..." : "Buat usulan"}
        </button>
        <span style={{ color: "var(--redup)", fontSize: "0.85rem" }}>
          {perintah.length}/4000
        </span>
      </div>

      {pesan && <p>{pesan}</p>}

      {usulan.length > 0 && (
        <section style={{ margin: "1rem 0" }}>
          <h2>Usulan ({usulan.length})</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
            {usulan.map((u, i) => (
              <li
                key={i}
                style={{
                  border: `1px solid ${u.bahaya ? "#a04040" : "var(--garis)"}`,
                  borderRadius: 8,
                  padding: "0.75rem",
                }}
              >
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={u.pilih}
                    onChange={(e) => ubah(i, e.target.checked)}
                  />
                  <span style={{ color: u.bahaya ? "#ff8a8a" : undefined, fontWeight: u.bahaya ? 700 : 400 }}>
                    {u.label}
                  </span>
                </label>
                {u.isi && (
                  <details style={{ marginTop: "0.5rem" }}>
                    <summary style={{ cursor: "pointer" }}>Lihat isi halaman</summary>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        background: "var(--panel)",
                        padding: "0.75rem",
                        borderRadius: 8,
                        maxHeight: 360,
                        overflow: "auto",
                      }}
                    >
                      {u.isi}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
          <button onClick={terapkan} disabled={sibuk || jumlahDipilih === 0}>
            {sibuk ? "Menerapkan..." : `Terapkan yang dicentang (${jumlahDipilih})`}
          </button>
        </section>
      )}

      {hasil.length > 0 && (
        <section style={{ margin: "1rem 0" }}>
          <h2>Hasil</h2>
          <ul style={{ paddingLeft: "1.2rem" }}>
            {hasil.map((h, i) => (
              <li key={i} style={{ color: h.ok ? undefined : "#ff8a8a" }}>
                {h.ok ? "Berhasil" : "Gagal"} ({h.target}): {h.pesan}
              </li>
            ))}
          </ul>
        </section>
      )}

      <hr style={{ borderColor: "var(--garis)", margin: "2rem 0" }} />

      <button onClick={muatRiwayat} disabled={sibuk}>
        Lihat riwayat aksi
      </button>
      {riwayat && (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
          {riwayat.length === 0 && <li style={{ color: "var(--redup)" }}>Belum ada riwayat.</li>}
          {riwayat.map((l) => (
            <li key={l.id} className="kartu">
              <div style={{ color: "var(--redup)", fontSize: "0.85rem" }}>
                {l.waktu ? new Date(l.waktu).toLocaleString("id-ID") : "-"} · {l.email}
              </div>
              {l.perintah && <div>&quot;{l.perintah}&quot;</div>}
              <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0 0" }}>
                {l.hasil.map((h, i) => (
                  <li key={i} style={{ color: h.ok ? undefined : "#ff8a8a" }}>
                    {h.tipe} ({h.target}): {h.pesan}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
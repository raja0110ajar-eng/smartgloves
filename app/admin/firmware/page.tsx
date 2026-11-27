"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebaseClient";
import { useAdmin } from "@/lib/useAdmin";
import { SEMVER } from "@/lib/firmwareAturan";

type Info = { ada: boolean; aktif?: boolean; versi?: string; ukuran?: number; md5?: string; catatan?: string; diubah?: number };

export default function FirmwareAdmin() {
  const { ready, isAdmin, api } = useAdmin();
  const [info, setInfo] = useState<Info | null>(null);
  const [versi, setVersi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);

  const muat = useCallback(async () => setInfo(await api("/api/admin/firmware")), [api]);

  useEffect(() => {
    if (isAdmin) muat().catch((e) => setPesan(e.message));
  }, [isAdmin, muat]);

  async function jalankan(aksi: () => Promise<string | void>) {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    try {
      const h = await aksi();
      if (h) setPesan(h);
      await muat();
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      kunci.current = false;
      setSibuk(false);
    }
  }

  function unggah() {
    if (!file) return;
    if (!SEMVER.test(versi)) { setPesan("Versi harus berbentuk 1.2.3, sama dengan VERSI_FIRMWARE di config.h."); return; }
    return jalankan(async () => {
      const token = await auth.currentUser?.getIdToken();
      const fd = new FormData();
      fd.append("versi", versi);
      fd.append("catatan", catatan);
      fd.append("file", file);
      const res = await fetch("/api/admin/firmware", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Gagal (HTTP ${res.status})`);
      setFile(null);
      return `Firmware ${versi} tersimpan. Master memeriksanya tiap 15 menit (atau ketik ota di Serial Monitor).`;
    });
  }

  function nonaktifkan() {
    if (!confirm("Nonaktifkan firmware di server? Perangkat berhenti memperbarui diri.")) return;
    return jalankan(async () => {
      await api("/api/admin/firmware", "DELETE");
      return "Dinonaktifkan.";
    });
  }

  if (!ready) return <p style={{ padding: "2rem" }}>Memuat...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>Akun ini bukan admin.</p>;

  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Firmware master</h1>
      <p style={{ color: "var(--redup)" }}>
        Di Arduino IDE: Sketch, Export Compiled Binary. Unggah berkas <code>smartgloves.ino.bin</code>
        (bukan yang berakhiran bootloader, partitions, atau merged). Isi versinya sama dengan
        VERSI_FIRMWARE di config.h. Hanya master yang diperbarui lewat Wi-Fi, slave tetap lewat USB.
      </p>
      {pesan && <p>{pesan}</p>}

      <section className="kartu" style={{ margin: "1rem 0" }}>
        <strong>Di server saat ini</strong>
        {info?.ada ? (
          <p style={{ margin: "0.5rem 0 0" }}>
            Versi {info.versi}, {((info.ukuran ?? 0) / 1024).toFixed(0)} KB, {info.aktif ? "aktif" : "nonaktif"}
            {info.diubah ? `, diunggah ${new Date(info.diubah).toLocaleString("id-ID")}` : ""}.
            {info.catatan ? ` Catatan: ${info.catatan}` : ""}
          </p>
        ) : (
          <p style={{ margin: "0.5rem 0 0" }}>Belum ada.</p>
        )}
        {info?.ada && info.aktif && (
          <div style={{ marginTop: "0.5rem" }}>
            <button onClick={nonaktifkan} disabled={sibuk}>Nonaktifkan</button>
          </div>
        )}
      </section>

      <section className="kartu" style={{ display: "grid", gap: "0.5rem" }}>
        <strong>Unggah versi baru</strong>
        <input placeholder="Versi (mis. 0.6.1)" value={versi} onChange={(e) => setVersi(e.target.value)} />
        <input placeholder="Catatan singkat (opsional)" maxLength={200} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        <input type="file" accept=".bin" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div>
          <button onClick={unggah} disabled={sibuk || !file}>
            {sibuk ? "Mengunggah..." : "Unggah firmware"}
          </button>
        </div>
      </section>
    </main>
  );
}
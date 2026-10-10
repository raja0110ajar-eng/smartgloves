import { KATEGORI, LABEL_KATEGORI, type Kategori } from "./kategori";
import { koreksiKata, levenshtein } from "./teks";

export type Kata = {
  id: string;
  nama: string;
  teks: string;
  kategori: Kategori;
};

export type Mode = "level" | "time" | "eja";
export type Umpan = { jenis: "benar" | "salah" | "info"; teks: string };
export type EventMasuk = { sign_id: string; teks: string; skor: number | null };

export const DETIK_PER_TARGET = 15;
export const DETIK_TIME_ATTACK = 60;
export const DETIK_PER_KATA_EJA = 30;
export const KATA_PER_RONDE_EJA = 5;
const SKOR_DEFAULT = 70;
const UKURAN_LEVEL = 5;

// Kata sederhana untuk mode Eja. Hanya yang semua hurufnya tersedia yang dipakai.
// Tidak ada huruf kembar berurutan (mis. "MAAF"), karena sarung tangan
// tidak mengulang huruf yang sama berturut-turut.
export const BANK_EJA = [
  "IBU", "AYAH", "ADIK", "KAKAK", "BUKU", "MEJA", "KURSI", "AIR", "API", "ANAK",
  "MAKAN", "MINUM", "TIDUR", "BAIK", "SAYA", "KAMU", "KAMI", "RUMAH", "GURU", "TOLONG",
  "HALO", "NASI", "IKAN", "AYAM", "BATU", "KAYU", "BUMI", "LAUT", "ANGIN", "SUKA",
  "BACA", "TULIS", "BUAH", "SATU", "TIGA", "LIMA", "ENAM", "DUA", "SIAPA",
];

/* ---------- Bantuan umum ---------- */

export function kocok<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Urutan target acak yang tidak mengulang kata yang sama berturut-turut
export function acakAntrean(sumber: Kata[], jumlah: number): Kata[] {
  const hasil: Kata[] = [];
  let terakhir = "";
  while (hasil.length < jumlah && sumber.length > 0) {
    const pilihan =
      sumber.length > 1 ? sumber.filter((k) => k.id !== terakhir) : sumber;
    const k = pilihan[Math.floor(Math.random() * pilihan.length)];
    hasil.push(k);
    terakhir = k.id;
  }
  return hasil;
}

export function hitungBintang(benar: number, total: number) {
  if (total <= 0) return 0;
  const p = benar / total;
  return p >= 0.9 ? 3 : p >= 0.75 ? 2 : p >= 0.6 ? 1 : 0;
}

/* ---------- Level dan kata eja ---------- */

// Level dibuat otomatis dari kamus: per kategori, urut nama, 5 isyarat per level
export function bangunLevel(kata: Kata[]): Kata[][] {
  const hasil: Kata[][] = [];
  for (const kat of KATEGORI) {
    const daftar = kata
      .filter((k) => k.kategori === kat)
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    const potongan: Kata[][] = [];
    for (let i = 0; i < daftar.length; i += UKURAN_LEVEL) {
      potongan.push(daftar.slice(i, i + UKURAN_LEVEL));
    }
    // potongan terakhir yang terlalu kecil digabung ke sebelumnya
    if (potongan.length > 1 && potongan[potongan.length - 1].length < 3) {
      const sisa = potongan.pop()!;
      potongan[potongan.length - 1].push(...sisa);
    }
    hasil.push(...potongan);
  }
  return hasil;
}

export function namaLevel(level: Kata[], indeks: number) {
  const kat = LABEL_KATEGORI[level[0].kategori];
  const awal = level[0].nama;
  const akhir = level[level.length - 1].nama;
  return `Level ${indeks + 1}: ${kat} ${awal === akhir ? awal : `${awal} - ${akhir}`}`;
}

// Kata dari BANK_EJA yang semua hurufnya ada sebagai isyarat huruf
export function kataEjaTersedia(kata: Kata[]): string[] {
  const huruf = new Set<string>();
  for (const k of kata) {
    if (k.kategori !== "huruf") continue;
    const t = k.teks.trim().toUpperCase();
    if (/^[A-Z]$/.test(t)) huruf.add(t);
  }
  return BANK_EJA.filter((w) => [...w].every((c) => huruf.has(c)));
}

/* ---------- Progres (disimpan di browser) ---------- */

export type Progres = {
  level: Record<string, { bintang: number; poin: number }>;
  timeAttack: number;
  eja: number;
};

const KUNCI = "smartgloves-latihan-v1";

export const progresKosong = (): Progres => ({ level: {}, timeAttack: 0, eja: 0 });

export function bacaProgres(): Progres {
  try {
    const mentah = localStorage.getItem(KUNCI);
    if (!mentah) return progresKosong();
    const p = JSON.parse(mentah);
    return {
      level: p && typeof p.level === "object" && p.level ? p.level : {},
      timeAttack: Number(p?.timeAttack) || 0,
      eja: Number(p?.eja) || 0,
    };
  } catch {
    return progresKosong();
  }
}

export function simpanProgres(p: Progres) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(p));
  } catch {
    /* abaikan kalau penyimpanan diblokir */
  }
}

/* ---------- Mesin permainan (reducer) ---------- */

export type Game = {
  fase: "menu" | "main" | "selesai";
  mode: Mode | null;
  levelIdx: number;
  antrean: Kata[];
  antreanEja: string[];
  kamusEja: string[];
  pos: number;
  mulaiMs: number;
  sisaDetik: number;
  poin: number;
  benar: number;
  terkumpul: string;
  umpan: Umpan | null;
};

export const AWAL: Game = {
  fase: "menu",
  mode: null,
  levelIdx: 0,
  antrean: [],
  antreanEja: [],
  kamusEja: [],
  pos: 0,
  mulaiMs: 0,
  sisaDetik: 0,
  poin: 0,
  benar: 0,
  terkumpul: "",
  umpan: null,
};

export type Aksi =
  | {
      tipe: "mulai";
      mode: Mode;
      levelIdx?: number;
      antrean?: Kata[];
      antreanEja?: string[];
      kamusEja?: string[];
      sekarang: number;
    }
  | { tipe: "event"; e: EventMasuk; sekarang: number }
  | { tipe: "tick"; sekarang: number }
  | { tipe: "lewati"; sekarang: number }
  | { tipe: "selesaiKata"; sekarang: number }
  | { tipe: "hapusHuruf" }
  | { tipe: "keluar" };

function detikAwal(mode: Mode | null) {
  if (mode === "time") return DETIK_TIME_ATTACK;
  if (mode === "eja") return DETIK_PER_KATA_EJA;
  return DETIK_PER_TARGET;
}

function nilaiUmpan(skor: number) {
  if (skor >= 90) return "Sempurna!";
  if (skor >= 75) return "Bagus!";
  return "Cukup, coba lebih rapi.";
}

function majuTarget(
  s: Game,
  sekarang: number,
  tambahPoin: number,
  benar: boolean,
  umpan: Umpan
): Game {
  const pos = s.pos + 1;
  const poin = s.poin + tambahPoin;
  const benarBaru = s.benar + (benar ? 1 : 0);
  const habis =
    s.mode === "eja" ? pos >= s.antreanEja.length : pos >= s.antrean.length;

  if (habis) {
    return { ...s, fase: "selesai", pos, poin, benar: benarBaru, terkumpul: "", umpan };
  }
  return {
    ...s,
    pos,
    poin,
    benar: benarBaru,
    terkumpul: "",
    mulaiMs: sekarang,
    // Time Attack memakai satu penghitung waktu untuk seluruh ronde
    sisaDetik: s.mode === "time" ? s.sisaDetik : detikAwal(s.mode),
    umpan,
  };
}

function selesaikanEja(s: Game, sekarang: number): Game {
  const target = s.antreanEja[s.pos];
  if (!target) return s;

  const dapat = s.terkumpul;
  const jarak = levenshtein(dapat, target);
  const poin = jarak === 0 ? 100 : jarak === 1 ? 60 : jarak === 2 ? 30 : 0;

  let umpan: Umpan;
  if (dapat.length === 0) {
    umpan = { jenis: "salah", teks: `Tidak ada huruf terbaca untuk "${target}".` };
  } else if (jarak === 0) {
    umpan = { jenis: "benar", teks: `Tepat! "${target}" terbaca benar. +${poin} poin` };
  } else {
    const koreksi = koreksiKata(dapat, s.kamusEja, 1);
    umpan =
      koreksi && koreksi.kata === target
        ? {
            jenis: "benar",
            teks: `Terbaca "${dapat}", dikoreksi otomatis ke "${target}". +${poin} poin`,
          }
        : {
            jenis: "salah",
            teks: `Terbaca "${dapat}", targetnya "${target}" (selisih ${jarak} huruf). +${poin} poin`,
          };
  }
  return majuTarget(s, sekarang, poin, jarak === 0, umpan);
}

function prosesEja(s: Game, e: EventMasuk, sekarang: number): Game {
  const huruf = e.teks.trim().toUpperCase();
  if (!/^[A-Z]$/.test(huruf)) {
    return {
      ...s,
      umpan: { jenis: "salah", teks: `"${e.teks}" bukan huruf. Eja memakai isyarat huruf.` },
    };
  }
  const target = s.antreanEja[s.pos];
  if (!target) return s;

  const terkumpul = s.terkumpul + huruf;
  if (terkumpul.length >= target.length) {
    return selesaikanEja({ ...s, terkumpul }, sekarang);
  }
  return { ...s, terkumpul, umpan: { jenis: "info", teks: `Huruf terbaca: ${huruf}` } };
}

export function reduksi(s: Game, a: Aksi): Game {
  switch (a.tipe) {
    case "mulai":
      return {
        ...AWAL,
        fase: "main",
        mode: a.mode,
        levelIdx: a.levelIdx ?? 0,
        antrean: a.antrean ?? [],
        antreanEja: a.antreanEja ?? [],
        kamusEja: a.kamusEja ?? [],
        mulaiMs: a.sekarang,
        sisaDetik: detikAwal(a.mode),
        umpan: { jenis: "info", teks: "Peragakan isyarat yang diminta." },
      };

    case "keluar":
      return AWAL;

    case "event": {
      if (s.fase !== "main") return s;
      if (s.mode === "eja") return prosesEja(s, a.e, a.sekarang);

      const target = s.antrean[s.pos];
      if (!target) return s;

      if (a.e.sign_id === target.id) {
        const skor = a.e.skor ?? SKOR_DEFAULT;
        const detik = Math.max(0, (a.sekarang - s.mulaiMs) / 1000);
        const bonus = Math.max(0, 50 - Math.round(detik * 5));
        const poin = skor + bonus;
        return majuTarget(s, a.sekarang, poin, true, {
          jenis: "benar",
          teks: `${nilaiUmpan(skor)} +${poin} poin (kecocokan ${skor}%, bonus kecepatan ${bonus})`,
        });
      }
      return {
        ...s,
        umpan: {
          jenis: "salah",
          teks: `Terbaca "${a.e.teks}", bukan "${target.teks}". Coba lagi.`,
        },
      };
    }

    case "tick": {
      if (s.fase !== "main") return s;
      const sisa = s.sisaDetik - 1;

      if (s.mode === "time") {
        if (sisa <= 0) {
          return { ...s, sisaDetik: 0, fase: "selesai", umpan: { jenis: "info", teks: "Waktu habis!" } };
        }
        return { ...s, sisaDetik: sisa };
      }

      if (sisa > 0) return { ...s, sisaDetik: sisa };

      if (s.mode === "eja") return selesaikanEja({ ...s, sisaDetik: 0 }, a.sekarang);

      const target = s.antrean[s.pos];
      return majuTarget({ ...s, sisaDetik: 0 }, a.sekarang, 0, false, {
        jenis: "salah",
        teks: `Waktu habis untuk "${target?.teks ?? ""}".`,
      });
    }

    case "lewati": {
      if (s.fase !== "main") return s;
      return majuTarget(s, a.sekarang, 0, false, { jenis: "info", teks: "Dilewati." });
    }

    case "selesaiKata": {
      if (s.fase !== "main" || s.mode !== "eja") return s;
      return selesaikanEja(s, a.sekarang);
    }

    case "hapusHuruf": {
      if (s.fase !== "main" || s.mode !== "eja") return s;
      return { ...s, terkumpul: s.terkumpul.slice(0, -1) };
    }
  }
}
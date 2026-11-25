import { describe, expect, it } from "vitest";
import {
  cariTumpangTindih,
  cocokkanPose,
  hitungKondisi,
  hitungSkor,
  jenisTangan,
  normKondisi,
  normSensor,
  type StaticRule,
} from "../lib/pose";
import type { Sample } from "../lib/schema";

const kanan: Sample = {
  R_IBU_JARI: 8,
  R_TELUNJUK: 80,
  R_TENGAH: 78,
  R_MANIS: 82,
  R_KELINGKING: 79,
  R_PITCH: 5,
  R_ROLL: 0,
};
const kiri: Sample = {
  L_IBU_JARI: 10,
  L_TELUNJUK: 20,
  L_TENGAH: 22,
  L_MANIS: 25,
  L_KELINGKING: 30,
  L_PITCH: -10,
  L_ROLL: 15,
};
const contoh = (u: Sample = {}): Sample => ({ ...kanan, ...u });
const ulang = (s: Sample, n = 10) => Array.from({ length: n }, () => ({ ...s }));

describe("hitungKondisi", () => {
  it("satu tangan: hanya sensor tangan itu, dengan margin minimal 5% dari rentang", () => {
    const hasil = hitungKondisi(ulang(kanan));
    expect(hasil).toHaveLength(7);
    expect(hasil.every((c) => c.sensor.startsWith("R_"))).toBe(true);
    expect(hasil.find((c) => c.sensor === "R_IBU_JARI")).toEqual({ sensor: "R_IBU_JARI", min: 3, max: 13 });
    expect(hasil.find((c) => c.sensor === "R_TELUNJUK")).toEqual({ sensor: "R_TELUNJUK", min: 75, max: 85 });
    expect(hasil.find((c) => c.sensor === "R_PITCH")).toEqual({ sensor: "R_PITCH", min: -4, max: 14 });
    expect(hasil.find((c) => c.sensor === "R_ROLL")).toEqual({ sensor: "R_ROLL", min: -18, max: 18 });
  });
  it("dua tangan: 14 kondisi", () => {
    const hasil = hitungKondisi(ulang({ ...kanan, ...kiri }));
    expect(hasil).toHaveLength(14);
    expect(hasil.find((c) => c.sensor === "L_TELUNJUK")).toEqual({ sensor: "L_TELUNJUK", min: 15, max: 25 });
    expect(hasil.find((c) => c.sensor === "L_PITCH")).toEqual({ sensor: "L_PITCH", min: -19, max: -1 });
  });
  it("sensor yang tidak ada di semua sampel diabaikan", () => {
    const sampel = [...ulang({ ...kanan, ...kiri }, 9), { ...kanan }];
    const hasil = hitungKondisi(sampel);
    expect(hasil).toHaveLength(7);
    expect(hasil.every((c) => c.sensor.startsWith("R_"))).toBe(true);
  });
  it("tidak keluar dari rentang sensor", () => {
    const hasil = hitungKondisi(ulang(contoh({ R_IBU_JARI: 0 })));
    expect(hasil.find((c) => c.sensor === "R_IBU_JARI")).toEqual({ sensor: "R_IBU_JARI", min: 0, max: 5 });
  });
  it("kosong kalau tidak ada sampel", () => {
    expect(hitungKondisi([])).toEqual([]);
  });
});

const ruleA: StaticRule = {
  sign_id: "a",
  teks: "A",
  bahasa: "SIBI",
  durasi_tahan_ms: 400,
  kondisi: [{ sensor: "R_TELUNJUK", min: 70, max: 90 }],
};
const ruleB: StaticRule = {
  sign_id: "b",
  teks: "B",
  bahasa: "SIBI",
  durasi_tahan_ms: 400,
  kondisi: [
    { sensor: "R_TELUNJUK", min: 70, max: 90 },
    { sensor: "R_IBU_JARI", min: 0, max: 10 },
  ],
};

describe("cocokkanPose", () => {
  it("memilih rule yang paling spesifik", () => {
    expect(cocokkanPose(contoh(), [ruleA, ruleB])?.sign_id).toBe("b");
  });
  it("memilih rule yang masih cocok", () => {
    expect(cocokkanPose(contoh({ R_IBU_JARI: 50 }), [ruleA, ruleB])?.sign_id).toBe("a");
  });
  it("null kalau tidak ada yang cocok", () => {
    expect(cocokkanPose(contoh({ R_TELUNJUK: 10 }), [ruleA, ruleB])).toBeNull();
  });
  it("sensor yang tidak ada membuat rule tidak cocok", () => {
    const duaTangan: StaticRule = {
      sign_id: "c",
      teks: "C",
      bahasa: "BISINDO",
      durasi_tahan_ms: 500,
      kondisi: [
        { sensor: "R_TELUNJUK", min: 70, max: 90 },
        { sensor: "L_TELUNJUK", min: 10, max: 30 },
      ],
    };
    expect(cocokkanPose(kanan, [duaTangan])).toBeNull();
    expect(cocokkanPose({ ...kanan, ...kiri }, [duaTangan])?.sign_id).toBe("c");
  });
  it("hanya mempertimbangkan bahasa yang aktif", () => {
    const sibi: StaticRule = { ...ruleA, sign_id: "sibi-x", bahasa: "SIBI" };
    const bisindo: StaticRule = { ...ruleA, sign_id: "bisindo-x", bahasa: "BISINDO" };
    expect(cocokkanPose(contoh(), [sibi, bisindo], "BISINDO")?.sign_id).toBe("bisindo-x");
    expect(cocokkanPose(contoh(), [sibi, bisindo], "SIBI")?.sign_id).toBe("sibi-x");
  });
  it("rule tanpa bahasa dianggap SIBI", () => {
    const lama: StaticRule = { ...ruleA, bahasa: undefined };
    expect(cocokkanPose(contoh(), [lama], "SIBI")?.sign_id).toBe("a");
    expect(cocokkanPose(contoh(), [lama], "BISINDO")).toBeNull();
  });
});

describe("cariTumpangTindih", () => {
  it("mendeteksi rentang yang beririsan", () => {
    const baru = [{ sensor: "R_TELUNJUK" as const, min: 85, max: 100 }];
    expect(cariTumpangTindih(baru, [ruleA]).map((r) => r.sign_id)).toEqual(["a"]);
  });
  it("tidak menandai rentang yang terpisah", () => {
    const baru = [{ sensor: "R_TELUNJUK" as const, min: 0, max: 20 }];
    expect(cariTumpangTindih(baru, [ruleA])).toEqual([]);
  });
});

describe("hitungSkor", () => {
  it("100 kalau tepat di tengah rentang", () => {
    expect(hitungSkor(contoh({ R_TELUNJUK: 80 }), ruleA)).toBe(100);
  });
  it("50 kalau tepat di tepi rentang", () => {
    expect(hitungSkor(contoh({ R_TELUNJUK: 70 }), ruleA)).toBe(50);
  });
  it("berkurang seiring menjauh dari tengah", () => {
    expect(hitungSkor(contoh({ R_TELUNJUK: 75 }), ruleA)).toBe(75);
  });
  it("rata-rata dari semua kondisi", () => {
    expect(hitungSkor(contoh(), ruleB)).toBe(85);
  });
  it("sensor yang tidak ada dihitung nol", () => {
    expect(hitungSkor({}, ruleA)).toBe(0);
  });
});

describe("normSensor dan normKondisi", () => {
  it("kunci lama dipetakan ke tangan kanan", () => {
    expect(normSensor("TELUNJUK")).toBe("R_TELUNJUK");
    expect(normSensor("ROLL")).toBe("R_ROLL");
  });
  it("kunci baru dipertahankan, kunci asing ditolak", () => {
    expect(normSensor("L_ROLL")).toBe("L_ROLL");
    expect(normSensor("XYZ")).toBeNull();
  });
  it("normKondisi memetakan dan membuang yang tidak valid", () => {
    const hasil = normKondisi([
      { sensor: "TELUNJUK", min: 1, max: 2 },
      { sensor: "L_ROLL", min: 3, max: 4 },
      { sensor: "ASING", min: 5, max: 6 },
      { sensor: "R_ROLL", min: "x", max: 6 },
    ]);
    expect(hasil).toEqual([
      { sensor: "R_TELUNJUK", min: 1, max: 2 },
      { sensor: "L_ROLL", min: 3, max: 4 },
    ]);
  });
  it("bukan array menghasilkan array kosong", () => {
    expect(normKondisi(undefined)).toEqual([]);
  });
});

describe("jenisTangan", () => {
  it("mengenali kanan, kiri, dan dua tangan", () => {
    expect(jenisTangan([{ sensor: "R_ROLL", min: 0, max: 1 }])).toBe("kanan");
    expect(jenisTangan([{ sensor: "L_ROLL", min: 0, max: 1 }])).toBe("kiri");
    expect(
      jenisTangan([
        { sensor: "R_ROLL", min: 0, max: 1 },
        { sensor: "L_ROLL", min: 0, max: 1 },
      ])
    ).toBe("dua");
    expect(jenisTangan([])).toBeNull();
  });
});
describe("hitungKondisi dengan faktor toleransi", () => {
  it("faktor besar memperlebar rentang dan faktor kecil mempersempitnya", () => {
    const sampel = ulang(kanan);
    const lebar = (f: number) => {
      const c = hitungKondisi(sampel, f).find((x) => x.sensor === "R_TELUNJUK")!;
      return c.max - c.min;
    };
    expect(lebar(2)).toBeGreaterThan(lebar(1));
    expect(lebar(0.5)).toBeLessThan(lebar(1));
  });
});
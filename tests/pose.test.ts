import { describe, expect, it } from "vitest";
import {
  cariTumpangTindih,
  cocokkanPose,
  hitungKondisi,
  hitungSkor,
  type StaticRule,
} from "../lib/pose";
import type { Sample } from "../lib/schema";

const dasar: Sample = {
  IBU_JARI: 8,
  TELUNJUK: 80,
  TENGAH: 78,
  MANIS: 82,
  KELINGKING: 79,
  PITCH: 5,
  ROLL: 0,
};
const contoh = (u: Partial<Sample> = {}): Sample => ({ ...dasar, ...u });

describe("hitungKondisi", () => {
  it("memberi margin minimal 5% dari rentang sensor", () => {
    const samples = Array.from({ length: 10 }, () => ({ ...dasar }));
    const hasil = hitungKondisi(samples);
    expect(hasil.find((c) => c.sensor === "IBU_JARI")).toEqual({ sensor: "IBU_JARI", min: 3, max: 13 });
    expect(hasil.find((c) => c.sensor === "TELUNJUK")).toEqual({ sensor: "TELUNJUK", min: 75, max: 85 });
    expect(hasil.find((c) => c.sensor === "PITCH")).toEqual({ sensor: "PITCH", min: -4, max: 14 });
    expect(hasil.find((c) => c.sensor === "ROLL")).toEqual({ sensor: "ROLL", min: -18, max: 18 });
  });
  it("tidak keluar dari rentang sensor", () => {
    const samples = Array.from({ length: 10 }, () => contoh({ IBU_JARI: 0 }));
    const jempol = hitungKondisi(samples).find((c) => c.sensor === "IBU_JARI");
    expect(jempol).toEqual({ sensor: "IBU_JARI", min: 0, max: 5 });
  });
});

const ruleA: StaticRule = {
  sign_id: "a",
  teks: "A",
  durasi_tahan_ms: 400,
  kondisi: [{ sensor: "TELUNJUK", min: 70, max: 90 }],
};
const ruleB: StaticRule = {
  sign_id: "b",
  teks: "B",
  durasi_tahan_ms: 400,
  kondisi: [
    { sensor: "TELUNJUK", min: 70, max: 90 },
    { sensor: "IBU_JARI", min: 0, max: 10 },
  ],
};

describe("cocokkanPose", () => {
  it("memilih rule yang paling spesifik", () => {
    expect(cocokkanPose(contoh(), [ruleA, ruleB])?.sign_id).toBe("b");
  });
  it("memilih rule yang masih cocok", () => {
    expect(cocokkanPose(contoh({ IBU_JARI: 50 }), [ruleA, ruleB])?.sign_id).toBe("a");
  });
  it("null kalau tidak ada yang cocok", () => {
    expect(cocokkanPose(contoh({ TELUNJUK: 10 }), [ruleA, ruleB])).toBeNull();
  });
});

describe("cariTumpangTindih", () => {
  it("mendeteksi rentang yang beririsan", () => {
    const baru = [{ sensor: "TELUNJUK" as const, min: 85, max: 100 }];
    expect(cariTumpangTindih(baru, [ruleA]).map((r) => r.sign_id)).toEqual(["a"]);
  });
  it("tidak menandai rentang yang terpisah", () => {
    const baru = [{ sensor: "TELUNJUK" as const, min: 0, max: 20 }];
    expect(cariTumpangTindih(baru, [ruleA])).toEqual([]);
  });
});

describe("hitungSkor", () => {
  it("100 kalau tepat di tengah rentang", () => {
    expect(hitungSkor(contoh({ TELUNJUK: 80 }), ruleA)).toBe(100);
  });
  it("50 kalau tepat di tepi rentang", () => {
    expect(hitungSkor(contoh({ TELUNJUK: 70 }), ruleA)).toBe(50);
  });
  it("berkurang seiring menjauh dari tengah", () => {
    expect(hitungSkor(contoh({ TELUNJUK: 75 }), ruleA)).toBe(75);
  });
  it("rata-rata dari semua kondisi", () => {
    expect(hitungSkor(contoh(), ruleB)).toBe(85);
  });
});
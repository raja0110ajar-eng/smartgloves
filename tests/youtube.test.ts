import { describe, expect, it } from "vitest";
import { idYoutube } from "../lib/youtube";

describe("idYoutube", () => {
  const id = "dQw4w9WgXcQ";
  it("mengenali bentuk tautan yang umum", () => {
    expect(idYoutube(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(idYoutube(`https://youtu.be/${id}`)).toBe(id);
    expect(idYoutube(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(idYoutube(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(idYoutube(`https://www.youtube.com/watch?feature=share&v=${id}`)).toBe(id);
  });
  it("menolak yang bukan YouTube atau ID salah panjang", () => {
    expect(idYoutube("https://contoh.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(idYoutube("https://youtu.be/pendek")).toBeNull();
    expect(idYoutube("bukan tautan")).toBeNull();
  });
});
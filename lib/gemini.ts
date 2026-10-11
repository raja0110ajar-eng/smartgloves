import { GoogleGenAI } from "@google/genai";
import { ekstrakJson } from "./aiBantu";

export async function tanyaGemini(instruksi: string, isi: string): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
    contents: isi,
    config: {
      systemInstruction: instruksi,
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });
  return ekstrakJson(res.text ?? "");
}

// Nama lama, dipertahankan supaya kode lama tidak error
export const tanyaJson = tanyaGemini;
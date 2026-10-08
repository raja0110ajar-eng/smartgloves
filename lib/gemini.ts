import { GoogleGenAI } from "@google/genai";

export async function tanyaJson(systemInstruction: string, isi: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
    contents: isi,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });
  const mentah = (res.text ?? "").replace(/```json|```/g, "").trim();
  return JSON.parse(mentah);
}
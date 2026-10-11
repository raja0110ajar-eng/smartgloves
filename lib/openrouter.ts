import { GalatHttp, ekstrakJson } from "./aiBantu";

export async function tanyaOpenRouter(instruksi: string, isi: string): Promise<unknown> {
  const kunci = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!kunci || !model) throw new GalatHttp(500, "OpenRouter belum dikonfigurasi.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kunci}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL ?? "https://smartgloves.vercel.app",
      "X-Title": "SmartGloves",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: instruksi },
        { role: "user", content: isi },
      ],
    }),
  });

  if (!res.ok) {
    const teks = await res.text().catch(() => "");
    throw new GalatHttp(res.status, `OpenRouter ${res.status}: ${teks.slice(0, 160)}`);
  }

  const j = await res.json().catch(() => null);

  // Kadang kegagalan penyedia datang sebagai HTTP 200 dengan isi "error"
  if (j?.error) {
    throw new GalatHttp(
      Number(j.error.code) || 502,
      `OpenRouter: ${String(j.error.message ?? "error").slice(0, 160)}`
    );
  }

  const teks = j?.choices?.[0]?.message?.content;
  if (typeof teks !== "string" || !teks.trim()) {
    throw new GalatHttp(502, "OpenRouter tidak mengembalikan jawaban.");
  }
  return ekstrakJson(teks);
}
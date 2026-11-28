export function ambilIp(req: Request) {
  return (
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "lokal"
  );
}

export async function verifikasiTurnstile(token: string, ip: string) {
  const rahasia = process.env.TURNSTILE_SECRET_KEY;
  if (!rahasia) return process.env.NODE_ENV !== "production"; // saat pengembangan boleh dilewati
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret: rahasia, response: token });
    if (ip && ip !== "lokal") form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    return (await res.json())?.success === true;
  } catch {
    return false;
  }
}
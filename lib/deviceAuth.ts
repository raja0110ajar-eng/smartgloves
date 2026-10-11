import { timingSafeEqual } from "node:crypto";

function sama(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function cekDevice(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return false;
  return [process.env.DEVICE_TOKEN, process.env.DEVICE_TOKEN_LAMA]
    .filter((t): t is string => !!t)
    .some((t) => sama(token, t));
}

// Batas jumlah event dari perangkat per hari, supaya kuota tulis harian tidak habis
export function batasEventHarian() {
  const n = Number(process.env.EVENT_BATAS_HARIAN);
  return Number.isFinite(n) && n > 0 ? n : 5000;
}
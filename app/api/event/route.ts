import { NextResponse } from "next/server";
import { EventSchema } from "@/lib/schema";

export async function POST(req: Request) {
  // 1. Cek "kunci" perangkat
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.DEVICE_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Baca data yang dikirim
  const body = await req.json().catch(() => null);

  // 3. Periksa bentuk datanya
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", detail: parsed.error.issues },
      { status: 400 }
    );
  }

  // 4. Kalau semua benar, balas OK
  return NextResponse.json({ ok: true, received: parsed.data });
}
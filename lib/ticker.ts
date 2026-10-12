import { adminDb } from "./firebaseAdmin";
import { TICKER_BAWAAN, TickerSchema, type Ticker } from "./tickerAturan";

export async function ambilTicker(): Promise<Ticker> {
  try {
    const d = await adminDb.collection("pengaturan").doc("ticker").get();
    if (!d.exists) return TICKER_BAWAAN;
    const x = d.data()!;
    const p = TickerSchema.safeParse({
      aktif: x.aktif !== false,
      pesan: Array.isArray(x.pesan) ? x.pesan : [],
    });
    return p.success ? p.data : TICKER_BAWAAN;
  } catch {
    return TICKER_BAWAAN;
  }
}
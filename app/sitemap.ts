import type { MetadataRoute } from "next";
import { ambilMenu } from "@/lib/halaman";

const SITE = process.env.SITE_URL ?? "https://smartgloves.vercel.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const halaman = await ambilMenu();
  const statis = ["/", "/kamus", "/latihan", "/live", "/tanya", "/privasi", "/pengujian"];
  return [...statis, ...halaman.map((h) => h.href)].map((p) => ({
    url: `${SITE}${p}`,
    lastModified: new Date(),
  }));
}
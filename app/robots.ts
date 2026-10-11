import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL ?? "https://smartgloves.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/login", "/api"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
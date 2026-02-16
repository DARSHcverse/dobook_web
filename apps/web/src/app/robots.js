import { headers } from "next/headers";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");

  return "https://www.do-book.com";
}

export default function robots() {
  const base = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/industries/"],
        disallow: ["/dashboard", "/auth", "/api/", "/book/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

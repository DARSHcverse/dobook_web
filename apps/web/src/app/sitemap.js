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

export default function sitemap() {
  const base = resolveSiteUrl();
  const lastModified = new Date();

  const industries = ["photobooth", "salon", "doctor", "consultant", "tutor", "fitness", "tradie"];

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...industries.map((industry) => ({
      url: `${base}/industries/${industry}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];
}

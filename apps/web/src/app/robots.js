function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  return "https://www.do-book.com";
}

export default function robots() {
  const base = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/industries/", "/terms", "/privacy", "/policies/"],
        disallow: ["/dashboard", "/auth", "/api/", "/book/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

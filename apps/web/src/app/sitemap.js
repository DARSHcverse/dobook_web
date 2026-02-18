function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  return "https://www.do-book.com";
}

export default function sitemap() {
  const base = resolveSiteUrl();
  const lastModified = new Date();

  const industries = ["photobooth", "salon", "doctor", "consultant", "tutor", "fitness", "tradie"];
  const staticPages = ["/terms", "/privacy", "/policies/cancellation"];

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...staticPages.map((path) => ({
      url: `${base}${path}`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    })),
    ...industries.map((industry) => ({
      url: `${base}/industries/${industry}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];
}

import { notFound } from "next/navigation";
import { LandingPage } from "@/App";
import IndustrySeoSection from "@/components/landing/IndustrySeoSection";
import { getIndustryContent, INDUSTRY_KEYS } from "@/lib/industryContent";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://www.do-book.com";
}

// Pre-build every industry page as static HTML at build time (best for SEO).
export function generateStaticParams() {
  return INDUSTRY_KEYS.map((industry) => ({ industry }));
}

export async function generateMetadata({ params }) {
  const key = String(params?.industry || "").toLowerCase();
  const cfg = getIndustryContent(key);
  if (!cfg) return {};

  const siteUrl = resolveSiteUrl();
  const description = cfg.metaDescription;

  return {
    metadataBase: new URL(siteUrl),
    title: cfg.title,
    description,
    alternates: { canonical: `/industries/${key}` },
    keywords: [
      `${cfg.label} booking system`,
      "online booking system",
      "appointment scheduling software",
      "booking system for small business",
      "service business scheduling",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: `/industries/${key}`,
      title: cfg.title,
      description,
      siteName: "DoBook",
      images: [{ url: "/brand/dobook-logo.png", alt: "DoBook" }],
    },
    twitter: {
      card: "summary",
      title: cfg.title,
      description,
      images: ["/brand/dobook-logo.png"],
    },
  };
}

export default function IndustryPage({ params }) {
  const key = String(params?.industry || "").toLowerCase();
  const cfg = getIndustryContent(key);
  if (!cfg) return notFound();

  // FAQ structured data → eligible for rich results in Google.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (cfg.faq || []).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Unique, server-rendered content — the part Google indexes and ranks. */}
      <IndustrySeoSection content={cfg} />
      {/* Shared interactive landing experience below the unique content. */}
      <LandingPage
        heroPrefix="Booking system"
        heroAccent={`for ${cfg.label}`}
        startFreeHref={`/auth?plan=free&industry=${encodeURIComponent(key)}`}
        getStartedHref={`/auth?industry=${encodeURIComponent(key)}`}
      />
    </>
  );
}

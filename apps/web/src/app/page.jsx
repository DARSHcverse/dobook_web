import { LandingPage } from "@/App";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  return "https://www.do-book.com";
}

export async function generateMetadata() {
  const title = "Online Booking System for Businesses | Free & Pro Plans | DoBook";
  const description =
    "DoBook is an all-in-one booking platform for businesses. Manage appointments, automatic invoices, reminders, and emails — free or Pro plans available.";

  const siteUrl = resolveSiteUrl();
  const metadataBase = new URL(siteUrl);

  return {
    metadataBase,
    title,
    description,
    alternates: { canonical: "/" },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      url: "/",
      title,
      description,
      siteName: "DoBook",
      images: [{ url: "/brand/dobook-logo.png", alt: "DoBook" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/brand/dobook-logo.png"],
    },
  };
}

export default function Page() {
  const siteUrl = resolveSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "DoBook",
        url: siteUrl,
        logo: `${siteUrl}/brand/dobook-logo.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "DoBook",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: "DoBook",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: [
          { "@type": "Offer", name: "Free Plan", price: "0", priceCurrency: "AUD" },
          { "@type": "Offer", name: "Pro Plan", price: "30", priceCurrency: "AUD" },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}

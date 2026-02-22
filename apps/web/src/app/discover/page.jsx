import DiscoverClient from "@/app/discover/DiscoverClient";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://www.do-book.com";
}

export function generateMetadata() {
  const base = resolveSiteUrl();
  const title = "Find Nearby Services | DoBook";
  const description = "Search for nearby businesses that use DoBook for online bookings.";
  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: "/discover" },
    robots: { index: true, follow: true },
  };
}

export default function DiscoverPage({ searchParams }) {
  const q = String(searchParams?.q || "");
  const postcode = String(searchParams?.postcode || "");
  return <DiscoverClient initialQ={q} initialPostcode={postcode} />;
}


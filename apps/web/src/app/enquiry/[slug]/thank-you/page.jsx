import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ThankYouClient from "./ThankYouClient";

async function fetchBusiness(slug) {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const res = await fetch(`${proto}://${host}/api/public/enquiry/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ThankYouPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await fetchBusiness(slug);
  if (!data?.business) notFound();
  return (
    <ThankYouClient
      business={data.business}
      refId={sp?.ref || ""}
      email={sp?.email || ""}
      name={sp?.name || ""}
    />
  );
}

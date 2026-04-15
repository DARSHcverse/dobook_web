import { headers } from "next/headers";
import { notFound } from "next/navigation";
import EnquiryFlow from "./EnquiryFlow";

async function fetchEnquiryData(slug) {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const res = await fetch(`${base}/api/public/enquiry/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await fetchEnquiryData(slug);
  if (!data?.business) return { title: "Enquiry" };
  const name = data.business.business_name || "Enquiry";
  return {
    title: `Enquiry — ${name}`,
    description: `Check availability, get a quote, and secure your date with ${name}.`,
  };
}

export default async function EnquiryPage({ params }) {
  const { slug } = await params;
  const data = await fetchEnquiryData(slug);
  if (!data?.business) notFound();
  return <EnquiryFlow initialData={data} slug={slug} />;
}

import BusinessProfileClient from "./profile-client";
import { buildBusinessMetadata, getPublicBusinessMeta } from "@/lib/publicBusinessMeta";

export async function generateMetadata({ params }) {
  const { businessId } = await params;
  const business = await getPublicBusinessMeta(businessId);
  // Unlisted businesses keep a generic title and stay out of search results.
  if (!business?.public_enabled) return { title: "DoBook", robots: { index: false } };
  return buildBusinessMetadata(business, { kind: "profile", path: `/discover/${businessId}` });
}

export default async function BusinessProfilePage({ params }) {
  const { businessId } = await params;
  return <BusinessProfileClient businessId={businessId} />;
}

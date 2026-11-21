import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Minimal, public-safe business fields for <title>/Open Graph on the
// per-business pages, so a shared booking link previews as the business
// ("Book N2N Photobooths") rather than a generic "DoBook".
export const getPublicBusinessMeta = cache(async (businessId) => {
  const id = String(businessId || "").trim();
  if (!UUID_RE.test(id)) return null;
  try {
    const { data } = await supabaseAdmin()
      .from("businesses")
      .select("id,business_name,public_description,logo_url,public_enabled")
      .eq("id", id)
      .maybeSingle();
    return data || null;
  } catch {
    // Metadata must never take the page down.
    return null;
  }
});

function clip(text, max) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export function buildBusinessMetadata(business, { kind, path }) {
  if (!business?.business_name) return { title: "DoBook" };
  const name = clip(business.business_name, 80);
  const title = kind === "profile" ? `${name} | DoBook` : `Book ${name} online | DoBook`;
  const description =
    clip(business.public_description, 155) ||
    (kind === "profile"
      ? `See services and prices from ${name}, and book online.`
      : `Check availability and book ${name} online in a couple of minutes.`);
  // Some logos are stored inline as data: URIs. Link-preview scrapers cannot
  // read those (and inlining one bloats every page head), so serve it via the
  // public logo endpoint instead.
  const logo = String(business.logo_url || "");
  const logoUrl = logo.startsWith("data:")
    ? `/api/public/business-logo?business_id=${encodeURIComponent(business.id)}`
    : logo;
  const images = logoUrl ? [{ url: logoUrl, alt: name }] : undefined;
  return {
    title,
    description,
    alternates: path ? { canonical: path } : undefined,
    openGraph: { title, description, type: "website", url: path, images },
    twitter: { card: "summary", title, description },
  };
}

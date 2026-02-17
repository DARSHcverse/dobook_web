import { NextResponse } from "next/server";
import { readDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://www.do-book.com";
}

function redirectToDefaultLogo() {
  const site = resolveSiteUrl();
  return NextResponse.redirect(`${site}/brand/dobook-logo.png`, 302);
}

function parseDataUrl(dataUrl) {
  const s = String(dataUrl || "").trim();
  const match = s.match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (!match) return null;
  const contentType = match[1] || "application/octet-stream";
  const base64 = match[2] || "";
  return { contentType, base64 };
}

export async function GET(request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("business_id") || "";
  if (!businessId) {
    return NextResponse.json({ detail: "business_id is required" }, { status: 400 });
  }

  let logoUrl = "";

  if (hasSupabaseConfig()) {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("businesses").select("logo_url").eq("id", businessId).maybeSingle();
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    logoUrl = String(data?.logo_url || "").trim();
  } else {
    const db = readDb();
    const business = (db.businesses || []).find((b) => String(b?.id || "") === String(businessId));
    logoUrl = String(business?.logo_url || "").trim();
  }

  if (!logoUrl) return redirectToDefaultLogo();

  const parsed = parseDataUrl(logoUrl);
  if (!parsed) return redirectToDefaultLogo();

  let bytes;
  try {
    bytes = Buffer.from(parsed.base64, "base64");
  } catch {
    return redirectToDefaultLogo();
  }

  // Avoid serving unbounded payloads.
  if (bytes.length > 2_000_000) return redirectToDefaultLogo();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": parsed.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

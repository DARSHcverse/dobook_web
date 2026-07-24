import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/app/api/_utils/rateLimit";
import { interpretSearch, rankBusinesses } from "@/lib/discoverMatch";

export const runtime = "nodejs";
export const maxDuration = 30;

function pickPublicBusiness(b) {
  return {
    id: b.id,
    business_name: String(b.business_name || "").trim(),
    business_type: String(b.business_type || "").trim(),
    industry: String(b.industry || "").trim(),
    booth_types: Array.isArray(b.booth_types) ? b.booth_types : [],
    public_services: Array.isArray(b.public_services) ? b.public_services : [],
    public_description: String(b.public_description || "").trim(),
    public_postcode: String(b.public_postcode || "").trim(),
    public_photos: Array.isArray(b.public_photos) ? b.public_photos : [],
    booking_url: `/book/${b.id}`,
    logo_url: `/api/public/business-logo?business_id=${encodeURIComponent(String(b.id || ""))}`,
  };
}

export async function POST(request) {
  const limited = await rateLimit({
    request,
    keyPrefix: "discover-smart-search",
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many searches. Try again shortly." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const body = await request.json().catch(() => ({}));
  const query = String(body?.query || "").trim();
  if (query.length < 3) {
    return NextResponse.json({ detail: "Tell us what you're looking for." }, { status: 400 });
  }

  // Interpret the natural-language request (one cheap AI call).
  let intent;
  try {
    intent = await interpretSearch(query);
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ detail: "Smart search is temporarily unavailable." }, { status: 503 });
    }
    return NextResponse.json({ detail: "Search failed. Please try again." }, { status: 502 });
  }
  if (!intent) {
    return NextResponse.json({ detail: "We couldn't understand that. Try rephrasing." }, { status: 422 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("businesses")
    .select(
      "id,business_name,business_type,industry,booth_types,public_services,public_enabled,public_description,public_postcode,public_photos",
    )
    .eq("public_enabled", true)
    .limit(200);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  const businesses = (data || []).map(pickPublicBusiness);
  const ranked = rankBusinesses(businesses, intent);

  return NextResponse.json({
    ok: true,
    intent: {
      summary: intent.intent_summary,
      max_budget: intent.max_budget,
      location_hint: intent.location_hint,
    },
    results: ranked.slice(0, 20).map((b) => ({
      id: b.id,
      business_name: b.business_name,
      business_type: b.business_type,
      public_description: b.public_description,
      public_postcode: b.public_postcode,
      public_services: b.public_services,
      logo_url: b.logo_url,
      booking_url: b.booking_url,
      match_reasons: b._reasons,
    })),
  });
}

import { NextResponse } from "next/server";
import { readDb, sanitizeBusiness } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function pickPublicBusiness(business) {
  const b = sanitizeBusiness(business);
  return {
    id: b.id,
    business_name: String(b.business_name || "").trim(),
    phone: String(b.phone || "").trim(),
    email: String(b.email || "").trim(),
    business_address: String(b.business_address || "").trim(),
    industry: String(b.industry || "photobooth").trim(),
    booth_types: Array.isArray(b.booth_types) ? b.booth_types : [],
    public_description: String(b.public_description || "").trim(),
    public_postcode: String(b.public_postcode || "").trim(),
    public_photos: Array.isArray(b.public_photos) ? b.public_photos : [],
    public_website: String(b.public_website || "").trim(),
    booking_url: `/book/${b.id}`,
    logo_url: `/api/public/business-logo?business_id=${encodeURIComponent(String(b.id || ""))}`,
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const q = normalizeQuery(url.searchParams.get("q"));
  const postcode = normalizeQuery(url.searchParams.get("postcode"));

  if (hasSupabaseConfig()) {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("businesses")
      .select(
        "id,business_name,email,phone,business_address,industry,booth_types,public_enabled,public_description,public_postcode,public_photos,public_website",
      )
      .eq("public_enabled", true)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

    let list = (data || []).map(pickPublicBusiness);
    if (q) {
      list = list.filter((b) => {
        const hay = `${b.business_name} ${b.public_description} ${b.industry}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (postcode) {
      list = list.filter((b) => String(b.public_postcode || "").toLowerCase().includes(postcode));
    }
    return NextResponse.json(list);
  }

  const db = readDb();
  const businesses = Array.isArray(db.businesses) ? db.businesses : [];
  let list = businesses.filter((b) => Boolean(b?.public_enabled)).map(pickPublicBusiness);
  if (q) {
    list = list.filter((b) => {
      const hay = `${b.business_name} ${b.public_description} ${b.industry}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (postcode) {
    list = list.filter((b) => String(b.public_postcode || "").toLowerCase().includes(postcode));
  }
  return NextResponse.json(list.slice(0, 100));
}


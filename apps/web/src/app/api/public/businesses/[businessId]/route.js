import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function sanitize(business) {
  if (!business) return null;
  return {
    id: business.id,
    business_name: business.business_name,
    industry: business.industry,
    logo_url: business.logo_url,
    business_address: business.business_address,
    public_enabled: Boolean(business.public_enabled),
    public_description: business.public_description,
    public_postcode: business.public_postcode,
    public_photos: Array.isArray(business.public_photos) ? business.public_photos : [],
    public_website: business.public_website,
    booth_types: Array.isArray(business.booth_types) ? business.booth_types : [],
    public_services: Array.isArray(business.public_services) ? business.public_services : [],
  };
}

export async function GET(_request, { params }) {
  try {
    const businessId = String(params?.businessId || "").trim();
    if (!businessId) return NextResponse.json({ detail: "businessId is required" }, { status: 400 });

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("businesses")
      .select(
        "id,business_name,industry,logo_url,business_address,public_enabled,public_description,public_postcode,public_photos,public_website,booth_types,public_services",
      )
      .eq("id", businessId)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ detail: "Business not found" }, { status: 404 });
    if (!data.public_enabled) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

    return NextResponse.json(sanitize(data));
  } catch (error) {
    console.error("Error fetching public business profile:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch business" }, { status: 500 });
  }
}

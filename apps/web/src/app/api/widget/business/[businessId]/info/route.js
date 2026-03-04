import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function resolveLogoSrc({ businessId, logoUrl }) {
  const s = String(logoUrl || "").trim();
  if (!s) return "/brand/dobook-logo.png";
  if (/^data:image\//i.test(s)) return `/api/public/business-logo?business_id=${encodeURIComponent(String(businessId || ""))}`;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return s;
  return s;
}

export async function GET(_request, { params }) {
  const businessId = params?.businessId;
  const sb = supabaseAdmin();
  const { data: business, error } = await sb
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

  return NextResponse.json({
    business_name: business.business_name || business.name,
    logo_src: resolveLogoSrc({ businessId, logoUrl: business.logo_url }),
    email: business.email,
    phone: business.phone,
    industry: business.industry || "photobooth",
    booth_types: business.booth_types || ["Open Booth", "Glam Booth", "Enclosed Booth"],
    booking_custom_fields: business.booking_custom_fields || [],
    travel_fee_enabled: Boolean(business.travel_fee_enabled),
    travel_fee_label: String(business.travel_fee_label || "Travel fee"),
    travel_fee_amount: Number(business.travel_fee_amount || 0),
    travel_fee_free_km: Number(business.travel_fee_free_km || 40),
    travel_fee_rate_per_km: Number(business.travel_fee_rate_per_km || 0.4),
    cbd_fee_enabled: Boolean(business.cbd_fee_enabled),
    cbd_fee_label: String(business.cbd_fee_label || "CBD logistics"),
    cbd_fee_amount: Number(business.cbd_fee_amount || 0),
  });
}

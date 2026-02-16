import { NextResponse } from "next/server";
import { readDb, sanitizeBusiness } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_request, { params }) {
  const businessId = params?.businessId;
  if (hasSupabaseConfig()) {
    const sb = supabaseAdmin();
    const { data: business, error } = await sb
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    if (!business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

    const safe = sanitizeBusiness(business);
    return NextResponse.json({
      business_name: safe.business_name,
      email: safe.email,
      phone: safe.phone,
      industry: safe.industry || "photobooth",
      booth_types: safe.booth_types || ["Open Booth", "Glam Booth", "Enclosed Booth"],
      booking_custom_fields: safe.booking_custom_fields || [],
    });
  }

  const db = readDb();
  const business = db.businesses.find((b) => b.id === businessId);
  if (!business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

  const safe = sanitizeBusiness(business);
  return NextResponse.json({
    business_name: safe.business_name,
    email: safe.email,
    phone: safe.phone,
    industry: safe.industry || "photobooth",
    booth_types: safe.booth_types || ["Open Booth", "Glam Booth", "Enclosed Booth"],
    booking_custom_fields: safe.booking_custom_fields || [],
  });
}

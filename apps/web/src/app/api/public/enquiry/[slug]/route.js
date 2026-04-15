import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function sanitizeBusiness(b) {
  if (!b) return null;
  return {
    id: b.id,
    slug: b.slug,
    business_name: b.business_name,
    industry: b.industry,
    logo_url: b.brand_logo_url || b.logo_url || "",
    brand_color: b.brand_color || "#E8193C",
    brand_logo_url: b.brand_logo_url || "",
    business_address: b.business_address || "",
    public_website: b.public_website || "",
    public_description: b.public_description || "",
    phone: b.phone || "",
    email: b.email || "",
    enquiry_page_enabled: b.enquiry_page_enabled !== false,
    enquiry_auto_quote: b.enquiry_auto_quote !== false,
    enquiry_response_hours: b.enquiry_response_hours || 24,
    enquiry_deposit_type: b.enquiry_deposit_type || "none",
    enquiry_deposit_amount: Number(b.enquiry_deposit_amount || 0),
    enquiry_deposit_percentage: Number(b.enquiry_deposit_percentage || 0),
    enquiry_quote_validity_hours: b.enquiry_quote_validity_hours || 48,
    enquiry_cancellation_policy: b.enquiry_cancellation_policy || "",
    enquiry_confirmation_message: b.enquiry_confirmation_message || "",
  };
}

export async function GET(_request, { params }) {
  try {
    const slug = String(params?.slug || "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ detail: "slug is required" }, { status: 400 });
    }

    const sb = supabaseAdmin();

    const { data: business, error: bErr } = await sb
      .from("businesses")
      .select(
        "id,slug,business_name,industry,logo_url,brand_color,brand_logo_url,business_address,public_website,public_description,public_enabled,phone,email,enquiry_page_enabled,enquiry_auto_quote,enquiry_response_hours,enquiry_deposit_type,enquiry_deposit_amount,enquiry_deposit_percentage,enquiry_quote_validity_hours,enquiry_cancellation_policy,enquiry_confirmation_message",
      )
      .ilike("slug", slug)
      .maybeSingle();

    if (bErr || !business) {
      return NextResponse.json({ detail: "Business not found" }, { status: 404 });
    }
    if (business.enquiry_page_enabled === false) {
      return NextResponse.json({ detail: "Enquiry page disabled" }, { status: 404 });
    }

    const [catRes, pkgRes, addonsRes] = await Promise.all([
      sb
        .from("package_categories")
        .select("id,name,description,image_url,sort_order")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      sb
        .from("packages")
        .select(
          "id,name,description,price,duration_hours,image_url,features,category_id,sort_order",
        )
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      sb
        .from("service_addons")
        .select("id,name,description,price,sort_order")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    return NextResponse.json({
      business: sanitizeBusiness(business),
      categories: catRes.data || [],
      packages: pkgRes.data || [],
      addons: addonsRes.data || [],
    });
  } catch (error) {
    console.error("[public/enquiry/slug] error:", error);
    return NextResponse.json(
      { detail: error?.message || "Failed to load enquiry page" },
      { status: 500 },
    );
  }
}

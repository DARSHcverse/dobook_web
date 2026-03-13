import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  const auth = requireAdminAuth(request);
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const status = String(url.searchParams.get("status") || "").trim().toLowerCase();
    const businessId = String(url.searchParams.get("businessId") || "").trim();

    const sb = supabaseAdmin();
    let query = sb
      .from("reviews")
      .select("id,business_id,customer_name,rating,comment,status,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (businessId) query = query.eq("business_id", businessId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ reviews: data || [] });
  } catch (error) {
    console.error("Error fetching admin reviews:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch reviews" }, { status: 500 });
  }
}

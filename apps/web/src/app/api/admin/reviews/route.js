import { NextResponse } from "next/server";
import { readDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const status = String(url.searchParams.get("status") || "").trim().toLowerCase();
    const businessId = String(url.searchParams.get("businessId") || "").trim();

    if (hasSupabaseConfig()) {
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
    }

    const db = readDb();
    let reviews = Array.isArray(db.reviews) ? db.reviews : [];
    if (status) reviews = reviews.filter((r) => String(r.status || "pending").toLowerCase() === status);
    if (businessId) reviews = reviews.filter((r) => r.business_id === businessId);
    reviews = reviews
      .slice()
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error fetching admin reviews:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch reviews" }, { status: 500 });
  }
}


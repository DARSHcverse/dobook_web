import { NextResponse } from "next/server";
import { readDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

function sanitize(review) {
  if (!review) return null;
  return {
    id: review.id,
    business_name: review.business_name,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
  };
}

export async function GET() {
  try {
    if (hasSupabaseConfig()) {
      const sb = supabaseAdmin();
      const { data, error } = await sb
        .from("platform_reviews")
        .select("id,business_name,rating,comment,created_at,status")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return NextResponse.json((data || []).map(sanitize).filter(Boolean));
    }

    const db = readDb();
    const list = (Array.isArray(db.platform_reviews) ? db.platform_reviews : [])
      .filter((r) => String(r.status || "pending") === "approved")
      .slice()
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      .slice(0, 12)
      .map(sanitize)
      .filter(Boolean);
    return NextResponse.json(list);
  } catch (error) {
    console.error("Error fetching platform reviews:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch reviews" }, { status: 500 });
  }
}


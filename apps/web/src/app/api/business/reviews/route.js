import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { readDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const status = String(url.searchParams.get("status") || "").trim().toLowerCase();

    if (hasSupabaseConfig()) {
      const sb = supabaseAdmin();
      let query = sb
        .from("reviews")
        .select("id,business_id,customer_name,rating,comment,status,created_at,updated_at")
        .eq("business_id", auth.business.id)
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ reviews: data || [] }, { status: 200 });
    }

    const db = readDb();
    let list = Array.isArray(db.reviews) ? db.reviews : [];
    list = list.filter((r) => String(r.business_id || "") === String(auth.business.id || ""));
    if (status) list = list.filter((r) => String(r.status || "pending").toLowerCase() === status);
    list = list.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return NextResponse.json({ reviews: list }, { status: 200 });
  } catch (error) {
    console.error("Error fetching business reviews:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch reviews" }, { status: 500 });
  }
}


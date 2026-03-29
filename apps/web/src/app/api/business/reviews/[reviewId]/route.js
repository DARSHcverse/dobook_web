import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  try {
    const reviewId = String(params?.reviewId || "").trim();
    if (!reviewId) return NextResponse.json({ detail: "reviewId is required" }, { status: 400 });

    const body = await request.json();
    const status = String(body?.status || "").trim().toLowerCase();
    const allowedStatuses = new Set(["pending", "approved", "rejected"]);
    if (!allowedStatuses.has(status)) return NextResponse.json({ detail: "Invalid status" }, { status: 400 });

    const sb = supabaseAdmin();
    const { data: existing, error: fetchError } = await sb
      .from("reviews")
      .select("id,business_id,status")
      .eq("id", reviewId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return NextResponse.json({ detail: "Review not found" }, { status: 404 });
    if (String(existing.business_id || "") !== String(auth.business.id || "")) {
      return NextResponse.json({ detail: "Not allowed" }, { status: 403 });
    }

    const { data, error } = await sb
      .from("reviews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reviewId)
      .eq("business_id", auth.business.id)
      .select("id,business_id,customer_name,rating,comment,status,created_at,updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ review: data }, { status: 200 });
  } catch (error) {
    console.error("Error updating business review:", error);
    return NextResponse.json({ detail: error?.message || "Failed to update review" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(request, { params }) {
  try {
    const { reviewId } = params;
    const body = await request.json();
    const status = String(body?.status || "").trim().toLowerCase();

    const allowedStatuses = new Set(["pending", "approved", "rejected"]);
    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ detail: "Invalid status" }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("platform_reviews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reviewId)
      .select("id,business_id,business_name,rating,comment,status,created_at,updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ review: data });
  } catch (error) {
    console.error("Error updating platform review:", error);
    return NextResponse.json({ detail: error?.message || "Failed to update review" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function parseIntSafe(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeReview(review) {
  if (!review) return null;
  return {
    id: review.id,
    business_id: review.business_id,
    customer_name: review.customer_name,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const businessId = String(url.searchParams.get("businessId") || "").trim();
    if (!businessId) {
      return NextResponse.json({ detail: "businessId is required" }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("reviews")
      .select("id,business_id,customer_name,rating,comment,created_at,status")
      .eq("business_id", businessId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const list = (data || []).map((r) => sanitizeReview(r)).filter(Boolean);
    return NextResponse.json(list);
  } catch (error) {
    console.error("Error fetching public reviews:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const businessId = String(body?.business_id || "").trim();
    const customerName = String(body?.customer_name || "").trim();
    const comment = String(body?.comment || "").trim();
    const rating = parseIntSafe(body?.rating, 0);

    if (!businessId) return NextResponse.json({ detail: "business_id is required" }, { status: 400 });
    if (!customerName || customerName.length < 2) {
      return NextResponse.json({ detail: "customer_name is required" }, { status: 400 });
    }
    if (!comment || comment.length < 10) {
      return NextResponse.json({ detail: "comment must be at least 10 characters" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ detail: "rating must be between 1 and 5" }, { status: 400 });
    }

    const review = {
      id: randomUUID(),
      business_id: businessId,
      customer_name: customerName,
      rating,
      comment,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sb = supabaseAdmin();
    const { error } = await sb.from("reviews").insert(review);

    if (error) {
      if (String(error.message || "").toLowerCase().includes("relation") && String(error.message || "").toLowerCase().includes("does not exist")) {
        return NextResponse.json(
          { detail: "Supabase table \"reviews\" is missing. Create it (columns: id, business_id, customer_name, rating, comment, status, created_at, updated_at)." },
          { status: 500 },
        );
      }
      throw error;
    }

    return NextResponse.json({ detail: "Review submitted for approval" }, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ detail: error?.message || "Failed to submit review" }, { status: 500 });
  }
}


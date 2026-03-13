import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

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

function reject(request, status, detail, reason) {
  const ip = getClientIp(request);
  const message = reason || detail;
  console.error(`[reject] POST /api/public/reviews ip=${ip} reason=${message}`);
  return NextResponse.json({ detail }, { status });
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
    const limited = rateLimit({
      request,
      keyPrefix: "public_reviews",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!limited.ok) {
      console.error(`[reject] POST /api/public/reviews ip=${limited.ip} reason=rate_limited`);
      const res = NextResponse.json({ detail: "Too many requests" }, { status: 429 });
      res.headers.set("Retry-After", String(limited.retryAfter || 3600));
      return res;
    }

    const body = await request.json();
    const businessId = String(body?.business_id || "").trim();
    const customerName = String(body?.customer_name || "").trim();
    const comment = String(body?.comment || "").trim();
    const rating = parseIntSafe(body?.rating, 0);

    if (!businessId) return reject(request, 400, "business_id is required", "missing_business_id");
    if (!customerName || customerName.length < 2) {
      return reject(request, 400, "customer_name is required", "invalid_customer_name");
    }
    if (!comment || comment.length < 10) {
      return reject(request, 400, "comment must be at least 10 characters", "comment_too_short");
    }
    if (rating < 1 || rating > 5) {
      return reject(request, 400, "rating must be between 1 and 5", "invalid_rating");
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
        return reject(
          request,
          500,
          "Supabase table \"reviews\" is missing. Create it (columns: id, business_id, customer_name, rating, comment, status, created_at, updated_at).",
          "missing_reviews_table",
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

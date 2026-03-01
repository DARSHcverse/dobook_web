import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/app/api/_utils/auth";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

function parseIntSafe(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function getLatestPlatformReview({ businessId }) {
  const safeBusinessId = String(businessId || "").trim();
  if (!safeBusinessId) return null;

  if (hasSupabaseConfig()) {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("platform_reviews")
      .select("id,status,created_at,updated_at")
      .eq("business_id", safeBusinessId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("relation") && msg.includes("does not exist")) return null;
      throw error;
    }
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  const db = readDb();
  const list = Array.isArray(db.platform_reviews) ? db.platform_reviews : [];
  const matches = list.filter((r) => String(r?.business_id || "").trim() === safeBusinessId);
  if (matches.length === 0) return null;
  matches.sort((a, b) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")));
  const latest = matches[0];
  return latest
    ? {
        id: latest.id,
        status: latest.status,
        created_at: latest.created_at,
        updated_at: latest.updated_at,
      }
    : null;
}

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  try {
    const businessId = String(auth.business?.id || "").trim();
    const review = await getLatestPlatformReview({ businessId });
    return NextResponse.json({ hasReview: Boolean(review), review }, { status: 200 });
  } catch (error) {
    console.error("Error fetching platform review:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch review" }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const rating = parseIntSafe(body?.rating, 0);
    const comment = String(body?.comment || "").trim();

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ detail: "rating must be between 1 and 5" }, { status: 400 });
    }
    if (!comment || comment.length < 10) {
      return NextResponse.json({ detail: "comment must be at least 10 characters" }, { status: 400 });
    }

    const businessId = String(auth.business?.id || "").trim();
    const businessName = String(auth.business?.business_name || "").trim() || "Business";

    const existing = await getLatestPlatformReview({ businessId });
    if (existing) {
      return NextResponse.json({ detail: "Review already submitted" }, { status: 409 });
    }

    const review = {
      id: randomUUID(),
      business_id: businessId,
      business_name: businessName,
      rating,
      comment,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (hasSupabaseConfig()) {
      const sb = supabaseAdmin();
      const { error } = await sb.from("platform_reviews").insert(review);
      if (error) {
        if (String(error.message || "").toLowerCase().includes("relation") && String(error.message || "").toLowerCase().includes("does not exist")) {
          return NextResponse.json(
            { detail: "Supabase table \"platform_reviews\" is missing. Run migrations to create it." },
            { status: 500 },
          );
        }
        throw error;
      }
      return NextResponse.json({ detail: "Review submitted for approval" }, { status: 201 });
    }

    const db = readDb();
    db.platform_reviews = Array.isArray(db.platform_reviews) ? db.platform_reviews : [];
    db.platform_reviews.push(review);
    writeDb(db);
    return NextResponse.json({ detail: "Review submitted for approval" }, { status: 201 });
  } catch (error) {
    console.error("Error creating platform review:", error);
    return NextResponse.json({ detail: error?.message || "Failed to submit review" }, { status: 500 });
  }
}

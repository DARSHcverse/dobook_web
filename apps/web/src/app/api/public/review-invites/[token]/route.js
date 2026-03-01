import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

function parseIntSafe(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeInvite(invite) {
  if (!invite) return null;
  return {
    token: invite.token,
    business_id: invite.business_id,
    customer_name: invite.customer_name,
    expires_at: invite.expires_at,
    used_at: invite.used_at,
  };
}

async function getInviteByTokenSupabase({ sb, token }) {
  const { data, error } = await sb
    .from("review_invites")
    .select("id,token,business_id,booking_id,customer_email,customer_name,used_at,review_id,created_at,expires_at,updated_at")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function getInviteByTokenLocal({ db, token }) {
  const list = Array.isArray(db.review_invites) ? db.review_invites : [];
  return list.find((i) => String(i.token || "") === token) || null;
}

async function insertReviewSupabase({ sb, review }) {
  const { error } = await sb.from("reviews").insert(review);
  if (!error) return { ok: true };

  const msg = String(error.message || "").toLowerCase();
  if (msg.includes("column") && msg.includes("does not exist")) {
    const minimal = {
      id: review.id,
      business_id: review.business_id,
      customer_name: review.customer_name,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      created_at: review.created_at,
      updated_at: review.updated_at,
    };
    const retry = await sb.from("reviews").insert(minimal);
    if (retry.error) throw retry.error;
    return { ok: true, downgraded: true };
  }

  throw error;
}

export async function GET(_request, { params }) {
  const token = String(params?.token || "").trim();
  if (!token) return NextResponse.json({ detail: "token is required" }, { status: 400 });

  try {
    if (hasSupabaseConfig()) {
      const sb = supabaseAdmin();
      const invite = await getInviteByTokenSupabase({ sb, token });
      if (!invite) return NextResponse.json({ detail: "Invite not found" }, { status: 404 });
      if (invite.used_at) return NextResponse.json({ detail: "Invite already used" }, { status: 410 });
      if (invite.expires_at && String(invite.expires_at) <= nowIso()) {
        return NextResponse.json({ detail: "Invite expired" }, { status: 410 });
      }
      return NextResponse.json({ invite: sanitizeInvite(invite) }, { status: 200 });
    }

    const db = readDb();
    const invite = getInviteByTokenLocal({ db, token });
    if (!invite) return NextResponse.json({ detail: "Invite not found" }, { status: 404 });
    if (invite.used_at) return NextResponse.json({ detail: "Invite already used" }, { status: 410 });
    if (invite.expires_at && String(invite.expires_at) <= nowIso()) {
      return NextResponse.json({ detail: "Invite expired" }, { status: 410 });
    }
    return NextResponse.json({ invite: sanitizeInvite(invite) }, { status: 200 });
  } catch (error) {
    console.error("Error fetching review invite:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch invite" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const token = String(params?.token || "").trim();
  if (!token) return NextResponse.json({ detail: "token is required" }, { status: 400 });

  try {
    const body = await request.json();
    const rating = parseIntSafe(body?.rating, 0);
    const comment = String(body?.comment || "").trim();
    const customerNameOverride = String(body?.customer_name || "").trim();

    if (rating < 1 || rating > 5) return NextResponse.json({ detail: "rating must be between 1 and 5" }, { status: 400 });
    if (!comment || comment.length < 10) return NextResponse.json({ detail: "comment must be at least 10 characters" }, { status: 400 });

    if (hasSupabaseConfig()) {
      const sb = supabaseAdmin();
      const invite = await getInviteByTokenSupabase({ sb, token });
      if (!invite) return NextResponse.json({ detail: "Invite not found" }, { status: 404 });
      if (invite.used_at) return NextResponse.json({ detail: "Invite already used" }, { status: 410 });
      if (invite.expires_at && String(invite.expires_at) <= nowIso()) {
        return NextResponse.json({ detail: "Invite expired" }, { status: 410 });
      }

      const customerName = customerNameOverride || String(invite.customer_name || "").trim() || "Customer";
      const review = {
        id: randomUUID(),
        business_id: invite.business_id,
        booking_id: invite.booking_id || null,
        customer_email: invite.customer_email || null,
        customer_name: customerName,
        rating,
        comment,
        status: "pending",
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      await insertReviewSupabase({ sb, review });
      await sb
        .from("review_invites")
        .update({ used_at: nowIso(), review_id: review.id, updated_at: nowIso() })
        .eq("id", invite.id);

      return NextResponse.json({ detail: "Review submitted for approval" }, { status: 201 });
    }

    const db = readDb();
    const invite = getInviteByTokenLocal({ db, token });
    if (!invite) return NextResponse.json({ detail: "Invite not found" }, { status: 404 });
    if (invite.used_at) return NextResponse.json({ detail: "Invite already used" }, { status: 410 });
    if (invite.expires_at && String(invite.expires_at) <= nowIso()) {
      return NextResponse.json({ detail: "Invite expired" }, { status: 410 });
    }

    const customerName = customerNameOverride || String(invite.customer_name || "").trim() || "Customer";
    const review = {
      id: randomUUID(),
      business_id: invite.business_id,
      booking_id: invite.booking_id || null,
      customer_email: invite.customer_email || null,
      customer_name: customerName,
      rating,
      comment,
      status: "pending",
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    db.reviews = Array.isArray(db.reviews) ? db.reviews : [];
    db.reviews.push(review);

    invite.used_at = nowIso();
    invite.review_id = review.id;
    invite.updated_at = nowIso();
    writeDb(db);

    return NextResponse.json({ detail: "Review submitted for approval" }, { status: 201 });
  } catch (error) {
    console.error("Error submitting invited review:", error);
    return NextResponse.json({ detail: error?.message || "Failed to submit review" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/app/api/_utils/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildReviewInviteUrl, sendReviewInviteEmail } from "@/lib/reviewInviteMailer";

function isLikelyEmail(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function nowIso() {
  return new Date().toISOString();
}

function plusDaysIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(1, Number(days || 30)));
  return d.toISOString();
}

async function findExistingInviteSupabase({ sb, businessId, bookingId, customerEmail, now }) {
  let q = sb
    .from("review_invites")
    .select("id,token,used_at,expires_at,created_at")
    .eq("business_id", businessId)
    .eq("booking_id", bookingId)
    .eq("customer_email", customerEmail)
    .order("created_at", { ascending: false })
    .limit(1);
  if (now) q = q.gt("expires_at", now);
  const { data, error } = await q;
  if (error) throw error;
  return Array.isArray(data) && data.length ? data[0] : null;
}

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const bookingId = String(body?.booking_id || "").trim();
    if (!bookingId) return NextResponse.json({ detail: "booking_id is required" }, { status: 400 });
    if (!isUuid(bookingId)) return NextResponse.json({ detail: "booking_id must be a UUID" }, { status: 400 });

    const businessId = String(auth.business?.id || "").trim();
    const businessName = String(auth.business?.business_name || auth.business?.email || "").trim() || "Business";

    let booking = null;
    const sb = supabaseAdmin();
    const { data: bookingData, error: bookingError } = await sb
      .from("bookings")
      .select("id,business_id,customer_name,customer_email,booking_date,booking_time,booth_type,service_type")
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (bookingError) throw bookingError;
    booking = bookingData || null;

    if (!booking) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });
    const customerEmail = String(booking?.customer_email || "").trim().toLowerCase();
    if (!isLikelyEmail(customerEmail)) return NextResponse.json({ detail: "Booking has no valid customer_email" }, { status: 400 });
    const customerName = String(booking?.customer_name || "").trim() || "Customer";

    const token = randomUUID();
    const inviteUrl = buildReviewInviteUrl({ request, token });
    const invite = {
      id: randomUUID(),
      token,
      business_id: businessId,
      booking_id: bookingId,
      customer_email: customerEmail,
      customer_name: customerName,
      used_at: null,
      review_id: null,
      created_at: nowIso(),
      expires_at: plusDaysIso(30),
      updated_at: nowIso(),
    };

    const now = nowIso();

    try {
      const existing = await findExistingInviteSupabase({ sb, businessId, bookingId, customerEmail, now });
      if (existing) {
        const url = buildReviewInviteUrl({ request, token: existing.token });
        const email = await sendReviewInviteEmail({
          request,
          to: customerEmail,
          businessName,
          customerName,
          inviteUrl: url,
        });
        return NextResponse.json({ url, email }, { status: 409 });
      }
    } catch (e) {
      const msg = String(e?.message || "").toLowerCase();
      if (!(msg.includes("relation") && msg.includes("does not exist"))) throw e;
      return NextResponse.json(
        { detail: "Supabase table \"review_invites\" is missing. Run migrations to create it." },
        { status: 500 },
      );
    }

    const { error } = await sb.from("review_invites").insert(invite);
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json(
          { detail: "Supabase table \"review_invites\" is missing. Run migrations to create it." },
          { status: 500 },
        );
      }
      throw error;
    }

    const email = await sendReviewInviteEmail({ request, to: customerEmail, businessName, customerName, inviteUrl });
    return NextResponse.json({ url: inviteUrl, email }, { status: 201 });
  } catch (error) {
    console.error("Error requesting review:", error);
    return NextResponse.json({ detail: error?.message || "Failed to request review" }, { status: 500 });
  }
}


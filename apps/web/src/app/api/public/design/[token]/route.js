import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { sendDesignResponseEmail } from "@/lib/design/approvalMailer";

export const runtime = "nodejs";

// Public endpoint: the customer has no account, so the unguessable token in the
// emailed link is the only credential. Nothing here exposes anything beyond the
// design itself — no contact details, no pricing, no other bookings.

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));
}

function publicView(booking, business) {
  return {
    status: booking.design_status || "pending",
    kind: booking.design_kind || "strip",
    preview_url: booking.design_preview_url || "",
    // First name only — the page greets the customer, it does not need the rest.
    customer_first_name: String(booking.customer_name || "").trim().split(/\s+/)[0] || "",
    booking_date: booking.booking_date || "",
    business_name: business?.business_name || "",
    business_logo: business?.logo_url || "",
  };
}

export async function GET(request, context) {
  const params = await context.params;
  const token = String(params?.token || "").trim();
  if (!isUuid(token)) return NextResponse.json({ detail: "Not found" }, { status: 404 });

  const sb = supabaseAdmin();
  const { data: booking, error } = await sb
    .from("bookings")
    .select(
      "id,business_id,customer_name,booking_date,design_status,design_kind,design_preview_url",
    )
    .eq("design_token", token)
    .maybeSingle();

  if (error || !booking) return NextResponse.json({ detail: "Not found" }, { status: 404 });

  const { data: business } = await sb
    .from("businesses")
    .select("business_name,logo_url")
    .eq("id", booking.business_id)
    .maybeSingle();

  return NextResponse.json(publicView(booking, business));
}

export async function POST(request, context) {
  const params = await context.params;
  const token = String(params?.token || "").trim();
  if (!isUuid(token)) return NextResponse.json({ detail: "Not found" }, { status: 404 });

  const limited = rateLimit({
    request,
    keyPrefix: `design-respond:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many requests" }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "").trim().toLowerCase();
  if (action !== "approve" && action !== "changes") {
    return NextResponse.json({ detail: "Invalid action" }, { status: 400 });
  }
  const feedback = String(body?.feedback || "").trim().slice(0, 1000);

  const sb = supabaseAdmin();
  const { data: booking, error } = await sb
    .from("bookings")
    .select("*")
    .eq("design_token", token)
    .maybeSingle();

  if (error || !booking) return NextResponse.json({ detail: "Not found" }, { status: 404 });

  const status = action === "approve" ? "approved" : "changes_requested";
  const { error: updErr } = await sb
    .from("bookings")
    .update({
      design_status: status,
      design_feedback: feedback || null,
      design_responded_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  if (updErr) {
    console.error("[public/design] update error:", updErr.message);
    return NextResponse.json({ detail: "Could not save your response" }, { status: 500 });
  }

  // Let the business know. Best-effort: the customer's answer is already saved,
  // so a mail failure must not make them think it did not register.
  try {
    const { data: business } = await sb
      .from("businesses")
      .select("*")
      .eq("id", booking.business_id)
      .maybeSingle();
    await sendDesignResponseEmail({
      booking,
      business,
      approved: action === "approve",
      feedback,
    });
  } catch (e) {
    console.error("[public/design] notify error:", e?.message);
  }

  return NextResponse.json({ ok: true, status });
}

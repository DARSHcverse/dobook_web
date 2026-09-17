import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/app/api/_utils/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hasProAccess } from "@/lib/entitlements";
import { normalizeDesignSpec } from "@/lib/design/specs";
import { normalizeMonogramSpec } from "@/lib/design/monogram";
import { sendDesignApprovalEmail } from "@/lib/design/approvalMailer";

export const runtime = "nodejs";

const MAX_PREVIEW_BYTES = 4 * 1024 * 1024;

function isMissingSchema(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  if (!hasProAccess(auth.business)) {
    return NextResponse.json(
      { detail: "Design Studio is available on the Pro plan." },
      { status: 403 },
    );
  }

  // Sending email costs money and reaches a real customer — cap it.
  const limited = await rateLimit({
    request,
    keyPrefix: `design-send:${auth.business.id}`,
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many sends. Try again shortly." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const body = await request.json().catch(() => ({}));
  const bookingId = String(body?.booking_id || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return NextResponse.json({ detail: "booking_id is required" }, { status: 400 });
  }

  const kind = body?.kind === "monogram" ? "monogram" : "strip";
  if (!body?.spec || typeof body.spec !== "object") {
    return NextResponse.json({ detail: "spec is required" }, { status: 400 });
  }
  const spec = kind === "monogram" ? normalizeMonogramSpec(body.spec) : normalizeDesignSpec(body.spec);

  // The browser renders the preview; we only accept a PNG data URL of it.
  const dataUrl = String(body?.preview || "");
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return NextResponse.json({ detail: "A PNG preview is required" }, { status: 400 });
  }
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > MAX_PREVIEW_BYTES) {
    return NextResponse.json({ detail: "Preview image is too large" }, { status: 413 });
  }

  // Booking must belong to this business.
  const { data: booking, error: bErr } = await auth.supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("business_id", auth.business.id)
    .maybeSingle();

  if (bErr) return NextResponse.json({ detail: bErr.message }, { status: 500 });
  if (!booking) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });
  if (!String(booking.customer_email || "").trim()) {
    return NextResponse.json(
      { detail: "This booking has no customer email address." },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();
  const token = randomUUID();
  const path = `${auth.business.id}/designs/${bookingId}-${Date.now()}.png`;

  const { error: upErr } = await sb.storage
    .from("business-images")
    .upload(path, bytes, { contentType: "image/png", upsert: false });

  if (upErr) {
    console.error("[design/send] upload error:", upErr.message);
    return NextResponse.json({ detail: "Could not store the preview image" }, { status: 500 });
  }

  const { data: urlData } = sb.storage.from("business-images").getPublicUrl(path);
  const previewUrl = urlData?.publicUrl || "";

  const { error: updErr } = await auth.supabase
    .from("bookings")
    .update({
      design_spec: spec,
      design_kind: kind,
      design_preview_url: previewUrl,
      design_status: "pending",
      design_token: token,
      design_feedback: null,
      design_sent_at: new Date().toISOString(),
      design_responded_at: null,
    })
    .eq("id", bookingId)
    .eq("business_id", auth.business.id);

  if (updErr) {
    if (isMissingSchema(updErr)) {
      return NextResponse.json(
        { detail: "Design approvals need a database migration that has not been applied yet." },
        { status: 503 },
      );
    }
    console.error("[design/send] update error:", updErr.message);
    return NextResponse.json({ detail: "Could not save the design" }, { status: 500 });
  }

  try {
    const result = await sendDesignApprovalEmail({
      booking,
      business: auth.business,
      previewUrl,
      token,
      kind,
    });
    if (result?.ok === false && !result?.skipped) {
      return NextResponse.json({ detail: "Design saved, but the email failed to send." }, { status: 502 });
    }
  } catch (e) {
    console.error("[design/send] email error:", e?.message);
    return NextResponse.json({ detail: "Design saved, but the email failed to send." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, preview_url: previewUrl });
}

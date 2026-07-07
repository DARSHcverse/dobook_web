import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";
import { sendPasswordResetEmail } from "@/lib/passwordResetMailer";
import { logAdminActivity } from "@/lib/adminActivity";

export const runtime = "nodejs";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://www.do-book.com";
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

// Admin-initiated password reset: issues a secure reset token and emails the
// business the standard reset link. The admin never sees or sets the password.
export async function POST(request, { params }) {
  const auth = requireAdminAuth(request);
  if (auth.error) return auth.error;

  const { businessId } = params;
  const sb = supabaseAdmin();

  const { data: business, error } = await sb
    .from("businesses")
    .select("id,business_name,email")
    .eq("id", businessId)
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });
  if (!String(business.email || "").trim()) {
    return NextResponse.json({ detail: "This business has no email on file" }, { status: 400 });
  }

  try {
    // Invalidate any outstanding unused tokens, then issue a fresh one.
    await sb.from("password_reset_tokens").delete().eq("business_id", business.id).is("used_at", null);

    const token = randomUUID();
    const token_hash = sha256Hex(token);
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: insErr } = await sb.from("password_reset_tokens").insert({
      business_id: business.id,
      token_hash,
      expires_at,
      used_at: null,
    });
    if (insErr) return NextResponse.json({ detail: insErr.message }, { status: 500 });

    const site = resolveSiteUrl();
    const resetUrl = `${site}/auth?reset=1&token=${encodeURIComponent(token)}`;
    const mail = await sendPasswordResetEmail({
      to: business.email,
      businessName: business.business_name,
      resetUrl,
    });

    if (mail && mail.ok === false) {
      return NextResponse.json({ detail: mail.error || "Failed to send reset email" }, { status: 502 });
    }

    await logAdminActivity({
      adminEmail: auth.email,
      action: "password_reset",
      targetBusinessId: business.id,
      details: { email: business.email },
    });

    return NextResponse.json({ ok: true, sent_to: business.email });
  } catch (e) {
    console.error("[admin password-reset] error:", e?.message);
    return NextResponse.json({ detail: "Failed to initiate password reset" }, { status: 500 });
  }
}

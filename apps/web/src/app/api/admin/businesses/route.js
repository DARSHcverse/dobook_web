import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";
import { logAdminActivity } from "@/lib/adminActivity";
import { getCountryProfile } from "@/lib/countries";
import { normalizeBusinessType } from "@/lib/businessTypeTemplates";
import { sendPasswordResetEmail } from "@/lib/passwordResetMailer";
import { createHash } from "node:crypto";

export async function GET(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const sb = supabaseAdmin();
    const { data: businesses, error } = await sb.from("businesses").select("*");

    if (error) throw error;

    // Remove password hashes from response
    const sanitizedBusinesses = (businesses || []).map(business => {
      const { password_hash, ...sanitized } = business;
      return sanitized;
    });

    return NextResponse.json({
      businesses: sanitizedBusinesses,
      total: sanitizedBusinesses.length
    });

  } catch (error) {
    console.error("Error fetching businesses:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch businesses" },
      { status: 500 }
    );
  }
}

// Admin-create a business. A random password is set; the owner receives a
// password-reset link so they can choose their own. Region defaults derive from
// the chosen country.
export async function POST(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const businessName = String(body?.business_name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!businessName || businessName.length < 2) {
      return NextResponse.json({ detail: "business_name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ detail: "A valid email is required" }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("businesses").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ detail: "A business with that email already exists" }, { status: 409 });
    }

    const region = getCountryProfile(body?.country_code);
    const plan = String(body?.subscription_plan || "free").trim().toLowerCase() === "pro" ? "pro" : "free";
    const business_type = normalizeBusinessType(body?.business_type);

    const id = randomUUID();
    // Random unguessable password; the owner resets it via the emailed link.
    const password_hash = await bcrypt.hash(randomUUID() + randomUUID(), 10);

    const row = {
      id,
      business_name: businessName,
      email,
      phone: String(body?.phone || ""),
      business_address: "",
      abn: "",
      password_hash,
      subscription_plan: plan,
      subscription_status: plan === "pro" ? "active" : "inactive",
      account_role: "user",
      country_code: region.code,
      currency: region.currency,
      distance_unit: region.distance_unit,
      timezone: region.timezone,
      business_type: business_type || null,
      created_at: new Date().toISOString(),
    };

    const { data: created, error } = await sb.from("businesses").insert(row).select().single();
    if (error) {
      console.error("Error creating business:", error);
      return NextResponse.json({ detail: error.message || "Failed to create business" }, { status: 500 });
    }

    // Issue a password-reset link so the owner can set their own password.
    let resetEmailSent = false;
    try {
      const token = randomUUID();
      const token_hash = createHash("sha256").update(token).digest("hex");
      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await sb.from("password_reset_tokens").insert({ business_id: id, token_hash, expires_at, used_at: null });
      const site = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.do-book.com").replace(/\/+$/, "");
      const resetUrl = `${site}/auth?reset=1&token=${encodeURIComponent(token)}`;
      const mail = await sendPasswordResetEmail({ to: email, businessName, resetUrl });
      resetEmailSent = !mail || mail.ok !== false;
    } catch (e) {
      console.warn("[admin create] reset email warning:", e?.message);
    }

    await logAdminActivity({
      adminEmail: auth.email,
      action: "create_business",
      targetBusinessId: id,
      details: { email, plan },
    });

    const { password_hash: _omit, ...safe } = created;
    return NextResponse.json({ business: safe, reset_email_sent: resetEmailSent }, { status: 201 });
  } catch (error) {
    console.error("Error in admin businesses POST:", error);
    return NextResponse.json({ detail: error?.message || "Internal server error" }, { status: 500 });
  }
}

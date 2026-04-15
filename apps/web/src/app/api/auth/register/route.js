import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBusinessWelcomeEmail, sendOwnerNewSignupEmail } from "@/lib/bookingMailer";
import { isOwnerEmail } from "@/lib/entitlements";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { buildSessionCookieOptions, sanitizeBusiness, SESSION_COOKIE } from "@/app/api/_utils/auth";
import { deriveBusinessSeedFromType, seedBusinessTypeDefaultsOnSignup } from "@/lib/businessTypeSeeder";
import { normalizeBusinessType } from "@/lib/businessTypeTemplates";
import { rateLimit } from "@/app/api/_utils/rateLimit";

export const runtime = "nodejs";

export async function POST(request) {
  const limited = await rateLimit({
    request,
    keyPrefix: "auth:register",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const body = await request.json().catch(() => ({}));
  const honeypot = String(body?.signup_hp || "").trim();
  if (honeypot) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const businessName = String(body?.business_name || "").trim();
  const phoneRaw = body?.phone ? String(body.phone) : "";
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const requested_plan = String(body?.subscription_plan || "free").trim().toLowerCase();
  const allowedPlans = new Set(["free", "pro"]);

  if (!allowedPlans.has(requested_plan)) {
    return NextResponse.json({ detail: "Invalid subscription_plan" }, { status: 400 });
  }

  const owner = isOwnerEmail(email);
  const subscription_plan = owner ? "pro" : "free";
  const subscription_status = owner ? "active" : "inactive";
  const account_role = owner ? "owner" : "user";

  const normalizeIndustry = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    const allowed = new Set(["photobooth", "salon", "doctor", "consultant", "tutor", "fitness", "tradie"]);
    return allowed.has(raw) ? raw : "photobooth";
  };
  const business_type = normalizeBusinessType(body?.business_type);
  const industry = normalizeIndustry(body?.industry);

  const defaultBoothTypesForIndustry = (ind) => {
    if (ind === "salon") return ["Haircut", "Color", "Styling"];
    if (ind === "doctor") return ["Consultation", "Follow-up"];
    if (ind === "consultant") return ["Consultation"];
    if (ind === "tutor") return ["Lesson"];
    if (ind === "fitness") return ["Training Session"];
    if (ind === "tradie") return ["Callout", "Quote", "Job"];
    return ["Open Booth", "Glam Booth", "Enclosed Booth"];
  };

  if (!businessName || businessName.length < 2) {
    return NextResponse.json({ detail: "Business name is required" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ detail: "Email is required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ detail: "Password must be at least 6 characters" }, { status: 400 });
  }
  if (phoneRaw && !isValidPhone(phoneRaw)) {
    return NextResponse.json(
      { detail: "Invalid phone number. Enter 10 digits or include country code (e.g. +61412345678)." },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();

  const { data: existing, error: existingError } = await sb
    .from("businesses")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ detail: existingError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ detail: "Email already registered" }, { status: 400 });
  }

  const id = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);

  const seed = business_type ? deriveBusinessSeedFromType({ businessType: business_type }) : null;
  const seededBoothTypes =
    Array.isArray(seed?.booth_types) && seed.booth_types.length ? seed.booth_types : defaultBoothTypesForIndustry(industry);

  const business = {
    id,
    business_name: businessName,
    email,
    phone,
    business_address: "",
    abn: "",
    logo_url: "",
    bank_name: "",
    account_name: "",
    bsb: "",
    account_number: "",
    payment_link: "",
    industry,
    business_type: seed?.business_type || null,
    booth_types: seededBoothTypes,
    booking_custom_fields: Array.isArray(seed?.booking_custom_fields) ? seed.booking_custom_fields : [],
    buffer_mins: Number(seed?.buffer_mins || 0),
    advance_booking_hrs: Number(seed?.advance_booking_hrs || 0),
    reminder_timing_hrs: Array.isArray(seed?.reminder_timing_hrs) ? seed.reminder_timing_hrs : [],
    reminders_enabled: String(subscription_plan || "free").trim().toLowerCase() === "pro",
    reminder_times: Array.isArray(seed?.reminder_timing_hrs) && seed.reminder_timing_hrs.length ? seed.reminder_timing_hrs : [48, 2],
    reminder_custom_message: "",
    reminder_include_payment_link: false,
    reminder_include_booking_details: true,
    confirmation_email_enabled: true,
    allow_recurring: Boolean(seed?.allow_recurring),
    require_deposit: Boolean(seed?.require_deposit),
    account_role,
    subscription_plan,
    subscription_status,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    subscription_current_period_end: null,
    booking_count: 0,
    invoice_seq: 0,
    password_hash,
    created_at: new Date().toISOString(),
    onboarding_tour_completed_at: null,
  };

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expires_at = expiresAt.toISOString();

  const { error: businessInsertError } = await sb.from("businesses").insert(business);
  if (businessInsertError) {
    if (String(businessInsertError.message || "").toLowerCase().includes("row-level security")) {
      return NextResponse.json(
        {
          detail:
            "Supabase RLS blocked creating the business. Make sure your server uses the service_role key: set SUPABASE_SERVICE_ROLE_KEY (or SUBABASE_API_KEY) to the service_role key, not the anon key.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ detail: businessInsertError.message }, { status: 400 });
  }

  const { error: sessionInsertError } = await sb.from("sessions").insert({
    token,
    business_id: id,
    created_at: new Date().toISOString(),
    expires_at,
  });
  if (sessionInsertError) {
    return NextResponse.json({ detail: sessionInsertError.message }, { status: 500 });
  }

  try {
    if (business_type) {
      await seedBusinessTypeDefaultsOnSignup({ sb, businessId: id, businessType: business_type });
    }
  } catch {
    // ignore seeding failures (business can apply from Settings later)
  }

  try {
    await sendBusinessWelcomeEmail({ business });
  } catch {
    // ignore email failures
  }

  try {
    await sendOwnerNewSignupEmail({ business, requestedPlan: requested_plan });
  } catch {
    // ignore email failures
  }

  const response = NextResponse.json({ business: sanitizeBusiness(business) });
  response.cookies.set(SESSION_COOKIE, token, buildSessionCookieOptions(request, expiresAt));
  return response;
}

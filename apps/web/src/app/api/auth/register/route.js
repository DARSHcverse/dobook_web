import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readDb, writeDb, sanitizeBusiness } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBusinessWelcomeEmail } from "@/lib/bookingMailer";

export async function POST(request) {
  const body = await request.json();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const businessName = String(body?.business_name || "").trim();
  const phone = body?.phone ? String(body.phone) : null;
  const requested_plan = String(body?.subscription_plan || "free").trim().toLowerCase();
  const allowedPlans = new Set(["free", "pro"]);
  if (!allowedPlans.has(requested_plan)) {
    return NextResponse.json({ detail: "Invalid subscription_plan" }, { status: 400 });
  }
  // Prevent bypassing Stripe by signing up directly as "pro".
  const subscription_plan = "free";

  if (!businessName || businessName.length < 2) {
    return NextResponse.json({ detail: "Business name is required" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ detail: "Email is required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ detail: "Password must be at least 6 characters" }, { status: 400 });
  }

  if (hasSupabaseConfig()) {
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
      booth_types: ["Open Booth", "Glam Booth", "Enclosed Booth"],
      booking_custom_fields: [],
      subscription_plan,
      subscription_status: "inactive",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_current_period_end: null,
      booking_count: 0,
      invoice_seq: 0,
      password_hash,
      created_at: new Date().toISOString(),
    };

    const token = randomUUID();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
      await sendBusinessWelcomeEmail({ business });
    } catch {
      // ignore email failures
    }

    return NextResponse.json({ token, business: sanitizeBusiness(business) });
  }

  const db = readDb();
  if (db.businesses.some((b) => b.email.toLowerCase() === email)) {
    return NextResponse.json({ detail: "Email already registered" }, { status: 400 });
  }

  const id = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);

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
    booth_types: ["Open Booth", "Glam Booth", "Enclosed Booth"],
    booking_custom_fields: [],
    subscription_plan,
    subscription_status: "inactive",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    subscription_current_period_end: null,
    booking_count: 0,
    invoice_seq: 0,
    password_hash,
    created_at: new Date().toISOString(),
  };

  const token = randomUUID();
  db.businesses.push(business);
  db.sessions.push({
    token,
    businessId: id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  writeDb(db);

  try {
    await sendBusinessWelcomeEmail({ business });
  } catch {
    // ignore email failures
  }

  return NextResponse.json({ token, business: sanitizeBusiness(business) });
}

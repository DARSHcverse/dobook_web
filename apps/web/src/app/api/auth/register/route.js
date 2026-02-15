import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readDb, writeDb, sanitizeBusiness } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const body = await request.json();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const businessName = String(body?.business_name || "").trim();
  const phone = body?.phone ? String(body.phone) : null;

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
      subscription_plan: "free",
      booking_count: 0,
      invoice_seq: 0,
      password_hash,
      created_at: new Date().toISOString(),
    };

    const token = randomUUID();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: businessInsertError } = await sb.from("businesses").insert(business);
    if (businessInsertError) {
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
    subscription_plan: "free",
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
  return NextResponse.json({ token, business: sanitizeBusiness(business) });
}

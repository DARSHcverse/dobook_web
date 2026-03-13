import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { isValidPhone, normalizePhone } from "@/lib/phone";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isLikelyEmail(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function asBool(value) {
  if (value === true || value === false) return value;
  const s = String(value || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("staff")
    .select("*")
    .eq("business_id", auth.business.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const name = String(body?.name || "").trim();
  const email = normalizeEmail(body?.email);
  const phoneRaw = String(body?.phone || "").trim();
  const is_active = asBool(body?.is_active ?? true);

  if (!name) return NextResponse.json({ detail: "Name is required" }, { status: 400 });
  if (!isLikelyEmail(email)) return NextResponse.json({ detail: "Valid email is required" }, { status: 400 });
  if (phoneRaw && !isValidPhone(phoneRaw)) {
    return NextResponse.json(
      { detail: "Invalid phone number. Enter 10 digits or include country code (e.g. +61412345678)." },
      { status: 400 },
    );
  }

  const { data: existing, error: existingErr } = await auth.supabase
    .from("staff")
    .select("id")
    .eq("business_id", auth.business.id)
    .ilike("email", email);
  if (existingErr) return NextResponse.json({ detail: existingErr.message }, { status: 500 });
  if (existing?.length) return NextResponse.json({ detail: "Email already exists for this business" }, { status: 409 });

  const { data, error } = await auth.supabase
    .from("staff")
    .insert({
      business_id: auth.business.id,
      name,
      email,
      phone: phoneRaw ? normalizePhone(phoneRaw) : "",
      is_active,
    })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

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

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const staffId = params?.staffId;
  if (!staffId) return NextResponse.json({ detail: "staffId is required" }, { status: 400 });

  const body = await request.json();
  const updates = {};

  if ("name" in (body || {})) {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ detail: "Name is required" }, { status: 400 });
    updates.name = name;
  }

  if ("email" in (body || {})) {
    const email = normalizeEmail(body?.email);
    if (!isLikelyEmail(email)) return NextResponse.json({ detail: "Valid email is required" }, { status: 400 });
    const { data: existing, error: existingErr } = await auth.supabase
      .from("staff")
      .select("id")
      .eq("business_id", auth.business.id)
      .ilike("email", email)
      .neq("id", staffId);
    if (existingErr) return NextResponse.json({ detail: existingErr.message }, { status: 500 });
    if (existing?.length) return NextResponse.json({ detail: "Email already exists for this business" }, { status: 409 });
    updates.email = email;
  }

  if ("phone" in (body || {})) {
    const phoneRaw = String(body?.phone || "").trim();
    if (phoneRaw && !isValidPhone(phoneRaw)) {
      return NextResponse.json(
        { detail: "Invalid phone number. Enter 10 digits or include country code (e.g. +61412345678)." },
        { status: 400 },
      );
    }
    updates.phone = phoneRaw ? normalizePhone(phoneRaw) : "";
  }

  if ("is_active" in (body || {})) {
    updates.is_active = asBool(body?.is_active);
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ detail: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("staff")
    .update(updates)
    .eq("id", staffId)
    .eq("business_id", auth.business.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ detail: "Staff not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const staffId = params?.staffId;
  if (!staffId) return NextResponse.json({ detail: "staffId is required" }, { status: 400 });

  const { error } = await auth.supabase
    .from("staff")
    .delete()
    .eq("id", staffId)
    .eq("business_id", auth.business.id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

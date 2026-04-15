import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

function sanitizeSlug(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 60);
}

export async function PATCH(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const sb = auth.supabase;
  const businessId = auth.business.id;
  const updates = {};

  if (body.slug !== undefined) {
    const slug = sanitizeSlug(body.slug);
    if (!slug) return NextResponse.json({ detail: "Slug cannot be empty" }, { status: 400 });

    const { data: existing } = await sb
      .from("businesses")
      .select("id")
      .ilike("slug", slug)
      .maybeSingle();
    if (existing && existing.id !== businessId) {
      return NextResponse.json({ detail: "That slug is already taken" }, { status: 409 });
    }
    updates.slug = slug;
  }

  if (body.brand_color !== undefined) {
    const c = String(body.brand_color || "").trim();
    if (c && !/^#[0-9a-fA-F]{6}$/.test(c)) {
      return NextResponse.json({ detail: "brand_color must be a #RRGGBB hex" }, { status: 400 });
    }
    updates.brand_color = c || "#E8193C";
  }
  if (body.brand_logo_url !== undefined) {
    updates.brand_logo_url = String(body.brand_logo_url || "").trim();
  }
  if (body.enquiry_page_enabled !== undefined) {
    updates.enquiry_page_enabled = Boolean(body.enquiry_page_enabled);
  }
  if (body.enquiry_auto_quote !== undefined) {
    updates.enquiry_auto_quote = Boolean(body.enquiry_auto_quote);
  }
  if (body.enquiry_response_hours !== undefined) {
    const n = Number(body.enquiry_response_hours);
    if (Number.isFinite(n) && n > 0 && n <= 168) updates.enquiry_response_hours = Math.round(n);
  }
  if (body.enquiry_quote_validity_hours !== undefined) {
    const n = Number(body.enquiry_quote_validity_hours);
    if (Number.isFinite(n) && n > 0 && n <= 720) updates.enquiry_quote_validity_hours = Math.round(n);
  }
  if (body.enquiry_cancellation_policy !== undefined) {
    updates.enquiry_cancellation_policy = String(body.enquiry_cancellation_policy || "").slice(0, 4000);
  }
  if (body.enquiry_confirmation_message !== undefined) {
    updates.enquiry_confirmation_message = String(body.enquiry_confirmation_message || "").slice(0, 2000);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ detail: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("businesses")
    .update(updates)
    .eq("id", businessId)
    .select(
      "id,slug,brand_color,brand_logo_url,enquiry_page_enabled,enquiry_auto_quote,enquiry_response_hours,enquiry_quote_validity_hours,enquiry_cancellation_policy,enquiry_confirmation_message",
    )
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
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
    .from("booking_form_fields")
    .select("*")
    .eq("business_id", auth.business.id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function PUT(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const input = Array.isArray(body) ? body : Array.isArray(body?.fields) ? body.fields : null;
  if (!input) return NextResponse.json({ detail: "fields array is required" }, { status: 400 });

  const rows = input
    .map((f, i) => {
      const field_name = String(f?.field_name || f?.field_label || "").trim();
      const field_key = normalizeKey(f?.field_key || field_name);
      if (!field_key || !field_name) return null;
      return {
        business_id: auth.business.id,
        field_key,
        field_name,
        field_type: String(f?.field_type || "text").trim(),
        required: asBool(f?.required),
        is_private: asBool(f?.is_private),
        sort_order: Number.isFinite(Number(f?.sort_order)) ? Number(f.sort_order) : i * 10,
        field_options: Array.isArray(f?.field_options) ? f.field_options : [],
      };
    })
    .filter(Boolean);

  const { error: delErr } = await auth.supabase.from("booking_form_fields").delete().eq("business_id", auth.business.id);
  if (delErr) return NextResponse.json({ detail: delErr.message }, { status: 500 });

  if (rows.length) {
    const { error: insErr } = await auth.supabase.from("booking_form_fields").insert(rows);
    if (insErr) return NextResponse.json({ detail: insErr.message }, { status: 400 });
  }

  return GET(request);
}


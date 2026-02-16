import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  return NextResponse.json(auth.sanitizeBusiness(auth.business));
}

export async function PUT(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const normalizeIndustry = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    const allowed = new Set(["photobooth", "salon", "doctor", "consultant", "tutor", "fitness", "tradie"]);
    return allowed.has(raw) ? raw : "photobooth";
  };
  const allowed = [
    "business_name",
    "phone",
    "business_address",
    "abn",
    "logo_url",
    "bank_name",
    "account_name",
    "bsb",
    "account_number",
    "payment_link",
    "industry",
    "booth_types",
    "booking_custom_fields",
  ];

  if (auth.mode === "supabase") {
    const updates = {};
    for (const key of allowed) {
      if (!(key in body)) continue;
      if (key === "industry") {
        updates.industry = normalizeIndustry(body.industry);
        continue;
      }
      if (key === "booth_types") {
        updates.booth_types = Array.isArray(body.booth_types)
          ? body.booth_types.map((v) => String(v || "").trim()).filter(Boolean)
          : [];
        continue;
      }
      if (key === "booking_custom_fields") {
        updates.booking_custom_fields = Array.isArray(body.booking_custom_fields)
          ? body.booking_custom_fields.map((f) => ({
            key: String(f?.key || "").trim(),
            label: String(f?.label || "").trim(),
            type: String(f?.type || "text").trim(),
          })).filter((f) => f.key && f.label)
          : [];
        continue;
      }
      updates[key] = body[key] ?? "";
    }

    const { data: updated, error } = await auth.supabase
      .from("businesses")
      .update(updates)
      .eq("id", auth.business.id)
      .select("*")
      .maybeSingle();

    if (error || !updated) {
      return NextResponse.json({ detail: error?.message || "Failed to update business" }, { status: 500 });
    }

    return NextResponse.json(auth.sanitizeBusiness(updated));
  }

  for (const key of allowed) {
    if (!(key in body)) continue;
    if (key === "industry") {
      auth.business.industry = normalizeIndustry(body.industry);
      continue;
    }
    if (key === "booth_types") {
      auth.business.booth_types = Array.isArray(body.booth_types)
        ? body.booth_types.map((v) => String(v || "").trim()).filter(Boolean)
        : [];
      continue;
    }
    if (key === "booking_custom_fields") {
      auth.business.booking_custom_fields = Array.isArray(body.booking_custom_fields)
        ? body.booking_custom_fields.map((f) => ({
          key: String(f?.key || "").trim(),
          label: String(f?.label || "").trim(),
          type: String(f?.type || "text").trim(),
        })).filter((f) => f.key && f.label)
        : [];
      continue;
    }
    auth.business[key] = body[key] ?? "";
  }

  auth.saveDb(auth.db);
  return NextResponse.json(auth.sanitizeBusiness(auth.business));
}

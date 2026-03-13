import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";
import { hasProAccess, isOwnerBusiness } from "@/lib/entitlements";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  return NextResponse.json(auth.sanitizeBusiness(auth.business));
}

export async function PUT(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const asBool = (value) => {
    if (value === true || value === false) return value;
    const s = String(value || "").trim().toLowerCase();
    if (!s) return false;
    return s === "1" || s === "true" || s === "yes" || s === "on";
  };
  const asMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100) / 100;
  };
  const normalizeIndustry = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    const allowed = new Set(["photobooth", "salon", "doctor", "consultant", "tutor", "fitness", "tradie"]);
    return allowed.has(raw) ? raw : "photobooth";
  };
  const normalizeReminderTimes = (value) => {
    const allowed = new Set([1, 2, 4, 12, 24, 48, 72, 168]);
    const list = Array.isArray(value) ? value : [];
    const cleaned = list
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && allowed.has(v));
    const unique = Array.from(new Set(cleaned));
    return unique.slice(0, 3);
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
    "travel_fee_enabled",
    "travel_fee_label",
    "travel_fee_amount",
    "travel_fee_free_km",
    "travel_fee_rate_per_km",
    "cbd_fee_enabled",
    "cbd_fee_label",
    "cbd_fee_amount",
    "public_enabled",
    "public_description",
    "public_postcode",
    "public_photos",
    "public_website",
    "public_services",
    "onboarding_tour_completed_at",
    "reminders_enabled",
    "reminder_times",
    "reminder_custom_message",
    "reminder_include_payment_link",
    "reminder_include_booking_details",
    "confirmation_email_enabled",
  ];

  if (auth.mode === "supabase") {
    const updates = {};
    for (const key of allowed) {
      if (!(key in body)) continue;
      if (key === "onboarding_tour_completed_at") {
        const raw = body.onboarding_tour_completed_at;
        if (raw === null || raw === "") {
          updates.onboarding_tour_completed_at = null;
        } else {
          const value = String(raw || "").trim();
          updates.onboarding_tour_completed_at = value ? value : null;
        }
        continue;
      }
      if (key === "industry") {
        updates.industry = normalizeIndustry(body.industry);
        continue;
      }
      if (key === "travel_fee_enabled" || key === "cbd_fee_enabled") {
        updates[key] = asBool(body[key]);
        continue;
      }
      if (key === "travel_fee_amount" || key === "cbd_fee_amount") {
        updates[key] = asMoney(body[key]);
        continue;
      }
      if (key === "travel_fee_free_km") {
        const v = Math.max(0, Math.min(5000, Math.floor(Number(body.travel_fee_free_km || 0))));
        updates.travel_fee_free_km = Number.isFinite(v) ? v : 40;
        continue;
      }
      if (key === "travel_fee_rate_per_km") {
        updates.travel_fee_rate_per_km = asMoney(body.travel_fee_rate_per_km);
        continue;
      }
      if (key === "public_enabled") {
        updates.public_enabled = asBool(body.public_enabled);
        continue;
      }
      if (key === "public_description") {
        updates.public_description = String(body.public_description || "").slice(0, 2000);
        continue;
      }
      if (key === "public_postcode") {
        updates.public_postcode = String(body.public_postcode || "").trim().slice(0, 16);
        continue;
      }
      if (key === "public_website") {
        updates.public_website = String(body.public_website || "").trim().slice(0, 200);
        continue;
      }
      if (key === "public_photos") {
        updates.public_photos = Array.isArray(body.public_photos)
          ? body.public_photos
            .map((v) => String(v || "").trim())
            .filter(Boolean)
            .slice(0, 8)
          : [];
        continue;
      }
      if (key === "public_services") {
        updates.public_services = Array.isArray(body.public_services)
          ? body.public_services
            .map((s) => ({
              name: String(s?.name || "").trim().slice(0, 80),
              description: String(s?.description || "").trim().slice(0, 400),
              unit: String(s?.unit || "").trim().slice(0, 40),
              price:
                s?.price === null || s?.price === undefined || s?.price === ""
                  ? null
                  : (() => {
                      const n = Number(s.price);
                      return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
                    })(),
            }))
            .filter((s) => s.name)
            .slice(0, 25)
          : [];
        continue;
      }
      if (key === "reminders_enabled") {
        const subStatus = String(auth.business?.subscription_status || "").trim().toLowerCase();
        const proActive = hasProAccess(auth.business) && (isOwnerBusiness(auth.business) || subStatus === "active");
        updates.reminders_enabled = proActive ? asBool(body.reminders_enabled) : false;
        continue;
      }
      if (key === "reminder_times") {
        updates.reminder_times = normalizeReminderTimes(body.reminder_times);
        continue;
      }
      if (key === "reminder_custom_message") {
        updates.reminder_custom_message = String(body.reminder_custom_message || "").slice(0, 300);
        continue;
      }
      if (key === "reminder_include_payment_link") {
        updates.reminder_include_payment_link = asBool(body.reminder_include_payment_link);
        continue;
      }
      if (key === "reminder_include_booking_details") {
        updates.reminder_include_booking_details = asBool(body.reminder_include_booking_details);
        continue;
      }
      if (key === "confirmation_email_enabled") {
        updates.confirmation_email_enabled = asBool(body.confirmation_email_enabled);
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
    if (key === "onboarding_tour_completed_at") {
      const raw = body.onboarding_tour_completed_at;
      if (raw === null || raw === "") {
        auth.business.onboarding_tour_completed_at = null;
      } else {
        const value = String(raw || "").trim();
        auth.business.onboarding_tour_completed_at = value ? value : null;
      }
      continue;
    }
    if (key === "industry") {
      auth.business.industry = normalizeIndustry(body.industry);
      continue;
    }
    if (key === "travel_fee_enabled" || key === "cbd_fee_enabled") {
      auth.business[key] = asBool(body[key]);
      continue;
    }
    if (key === "travel_fee_amount" || key === "cbd_fee_amount") {
      auth.business[key] = asMoney(body[key]);
      continue;
    }
    if (key === "travel_fee_free_km") {
      const v = Math.max(0, Math.min(5000, Math.floor(Number(body.travel_fee_free_km || 0))));
      auth.business.travel_fee_free_km = Number.isFinite(v) ? v : 40;
      continue;
    }
    if (key === "travel_fee_rate_per_km") {
      auth.business.travel_fee_rate_per_km = asMoney(body.travel_fee_rate_per_km);
      continue;
    }
    if (key === "public_enabled") {
      auth.business.public_enabled = asBool(body.public_enabled);
      continue;
    }
    if (key === "public_description") {
      auth.business.public_description = String(body.public_description || "").slice(0, 2000);
      continue;
    }
    if (key === "public_postcode") {
      auth.business.public_postcode = String(body.public_postcode || "").trim().slice(0, 16);
      continue;
    }
    if (key === "public_website") {
      auth.business.public_website = String(body.public_website || "").trim().slice(0, 200);
      continue;
    }
    if (key === "public_photos") {
      auth.business.public_photos = Array.isArray(body.public_photos)
        ? body.public_photos.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 8)
        : [];
      continue;
    }
    if (key === "public_services") {
      auth.business.public_services = Array.isArray(body.public_services)
        ? body.public_services
          .map((s) => ({
            name: String(s?.name || "").trim().slice(0, 80),
            description: String(s?.description || "").trim().slice(0, 400),
            unit: String(s?.unit || "").trim().slice(0, 40),
            price:
              s?.price === null || s?.price === undefined || s?.price === ""
                ? null
                : (() => {
                    const n = Number(s.price);
                    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
                  })(),
          }))
          .filter((s) => s.name)
          .slice(0, 25)
        : [];
      continue;
    }
    if (key === "reminders_enabled") {
      const subStatus = String(auth.business?.subscription_status || "").trim().toLowerCase();
      const proActive = hasProAccess(auth.business) && (isOwnerBusiness(auth.business) || subStatus === "active");
      auth.business.reminders_enabled = proActive ? asBool(body.reminders_enabled) : false;
      continue;
    }
    if (key === "reminder_times") {
      auth.business.reminder_times = normalizeReminderTimes(body.reminder_times);
      continue;
    }
    if (key === "reminder_custom_message") {
      auth.business.reminder_custom_message = String(body.reminder_custom_message || "").slice(0, 300);
      continue;
    }
    if (key === "reminder_include_payment_link") {
      auth.business.reminder_include_payment_link = asBool(body.reminder_include_payment_link);
      continue;
    }
    if (key === "reminder_include_booking_details") {
      auth.business.reminder_include_booking_details = asBool(body.reminder_include_booking_details);
      continue;
    }
    if (key === "confirmation_email_enabled") {
      auth.business.confirmation_email_enabled = asBool(body.confirmation_email_enabled);
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

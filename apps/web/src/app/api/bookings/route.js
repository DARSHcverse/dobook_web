import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "../_utils/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { scheduleBookingRemindersViaResend, sendBookingCreatedEmails } from "@/lib/bookingMailer";
import { hasProAccess } from "@/lib/entitlements";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import {
  drivingDistanceKmGeoapify,
  extractLatLonFromAutocompleteItem,
  geocodeAddressGeoapify,
  haversineDistanceKm,
} from "@/lib/geoapify";

const FREE_PLAN_MAX_BOOKINGS_PER_MONTH = 10;

function asMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function normalizePostcode(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  const digits = s.replaceAll(/\D+/g, "");
  if (digits.length !== 4) return null;
  return digits;
}

function extractPostcodeFromAutocompleteItem(item) {
  if (!item || typeof item !== "object") return null;
  const raw =
    item?.postcode ||
    item?.zip ||
    item?.properties?.postcode ||
    item?.properties?.zip ||
    item?.properties?.postCode ||
    item?.properties?.postal_code;
  return normalizePostcode(raw);
}

function extractPostcodeFromAddressString(address) {
  const s = String(address || "");
  const matches = s.match(/\b(\d{4})\b/g);
  if (!matches?.length) return null;
  return normalizePostcode(matches[matches.length - 1]);
}

function resolveEventPostcode(body) {
  return (
    extractPostcodeFromAutocompleteItem(body?.event_location_geo || null) ||
    extractPostcodeFromAddressString(body?.event_location || "")
  );
}

function formatHours(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function buildLineItemsAndTotal({ body, business, addons = [] }) {
  const qty = Math.max(1, Number(body?.quantity || 1));
  const unit = asMoney(body?.price);
  const booth = String(body?.booth_type || body?.service_type || "Service").trim() || "Service";
  const hoursRaw = body?.duration_minutes ? Number(body.duration_minutes) / 60 : 0;
  const hours = formatHours(hoursRaw) || "1";
  const hourLabel = Number(hours) === 1 ? "Hour" : "Hours";
  const baseDesc = `${hours} ${hourLabel} ${booth}`;

  const items = [
    {
      description: baseDesc,
      qty,
      unit_price: unit,
      total: asMoney(unit * qty),
    },
  ];

  // Travel fee is calculated automatically (distance-based) before calling this function.
  // It is passed in via `body._computed_travel_fee` by the route handler.
  const computed = body?._computed_travel_fee;
  if (computed?.amount && computed.amount > 0) {
    items.push({
      description: computed.description || "Travel charge",
      qty: Number(computed.qty || 1),
      unit_price: asMoney(computed.unit_price),
      total: asMoney(computed.amount),
    });
  }

  for (const addon of Array.isArray(addons) ? addons : []) {
    const name = String(addon?.name || "").trim();
    if (!name) continue;
    const addonPrice = asMoney(addon?.price);
    items.push({
      description: name,
      qty: 1,
      unit_price: addonPrice,
      total: addonPrice,
    });
  }

  const cbdEnabled = Boolean(business?.cbd_fee_enabled);
  const cbdLabel = String(business?.cbd_fee_label || "CBD logistics").trim() || "CBD logistics";
  const cbdAmount = asMoney(business?.cbd_fee_amount);
  const eventPostcode = resolveEventPostcode(body);
  const applyCbd = cbdEnabled && cbdAmount > 0 && eventPostcode === "3000";
  if (applyCbd) {
    items.push({
      description: cbdLabel,
      qty: 1,
      unit_price: cbdAmount,
      total: cbdAmount,
    });
  }

  const totalAmount = asMoney(items.reduce((sum, it) => sum + asMoney(it?.total), 0));
  return { line_items: items, total_amount: totalAmount };
}

function normalizeAddonIds(value) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  for (const raw of list) {
    const s = String(raw || "").trim();
    if (!s) continue;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) continue;
    out.push(s);
  }
  return Array.from(new Set(out)).slice(0, 20);
}

async function computeTravelFee({ business, body }) {
  if (!business) return null;
  if (!Boolean(business?.travel_fee_enabled)) return null;

  const freeKm = Math.max(0, Math.floor(Number(business?.travel_fee_free_km ?? 40)));
  const rate = asMoney(business?.travel_fee_rate_per_km ?? 0.4);
  if (!(rate > 0)) return null;

  const eventAddress = String(body?.event_location || "").trim();
  if (!eventAddress) return null;
  const businessAddress = String(business?.business_address || "").trim();
  if (!businessAddress) return null;

  const eventFromAutocomplete = extractLatLonFromAutocompleteItem(body?.event_location_geo || null);
  const eventGeo = eventFromAutocomplete || (await geocodeAddressGeoapify(eventAddress));
  const bizGeo = await geocodeAddressGeoapify(businessAddress);
  if (!eventGeo || !bizGeo) return null;

  let km = await drivingDistanceKmGeoapify(bizGeo, eventGeo);
  if (!Number.isFinite(km) || km <= 0) {
    km = haversineDistanceKm(bizGeo, eventGeo);
  }
  if (!Number.isFinite(km) || km <= 0) return null;

  const roundedKm = Math.round(km);
  const billableKm = Math.max(0, roundedKm - freeKm);
  const amount = Math.round(billableKm * rate * 100) / 100;
  if (!(amount > 0)) {
    return { distance_km: Math.round(km * 100) / 100, travel_km_billable: 0, travel_fee_amount: 0, lineItem: null };
  }

  const label = String(business?.travel_fee_label || "Travel charge").trim() || "Travel charge";
  const description = `${label} (${billableKm} km @ $${rate.toFixed(2)}/km)`;

  return {
    distance_km: Math.round(km * 100) / 100,
    travel_km_billable: billableKm,
    travel_fee_amount: amount,
    lineItem: { description, qty: billableKm, unit_price: rate, amount },
  };
}

function monthRangeUtc(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function dueDateIsoFromBookingDate(bookingDateStr) {
  const s = String(bookingDateStr || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map((n) => Number(n));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

function isYmd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function isHm(value) {
  return /^\d{2}:\d{2}$/.test(String(value || "").trim());
}

function isValidEmail(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizeCustomFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const key = String(k || "").trim();
    if (!key) continue;
    if (v === undefined) continue;
    out[key] = v === null ? "" : v;
  }
  return out;
}

async function getActiveInvoiceTemplateSupabase(sb, businessId) {
  const { data, error } = await sb
    .from("invoice_templates")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return null;
  return (data && data[0]) || null;
}

function reject(request, status, detail, reason) {
  const ip = getClientIp(request);
  const message = reason || detail;
  console.error(`[reject] POST /api/bookings ip=${ip} reason=${message}`);
  return NextResponse.json({ detail }, { status });
}

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("bookings")
    .select("*")
    .eq("business_id", auth.business.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  const limited = rateLimit({
    request,
    keyPrefix: "bookings",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    console.error(`[reject] POST /api/bookings ip=${limited.ip} reason=rate_limited`);
    const res = NextResponse.json({ detail: "Too many requests" }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const raw = await request.text();
  const maxBytes = 50 * 1024;
  if (Buffer.byteLength(raw || "", "utf8") > maxBytes) {
    return reject(request, 413, "Payload too large", "payload_too_large");
  }

  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return reject(request, 400, "Invalid JSON body", "invalid_json");
  }

  const honeypotValue = String(body?.company_website || "").trim();
  if (honeypotValue) {
    console.error(`[reject] POST /api/bookings ip=${getClientIp(request)} reason=honeypot`);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const allowedKeys = new Set([
    "business_id",
    "customer_name",
    "customer_email",
    "customer_phone",
    "service_type",
    "booth_type",
    "package_duration",
    "event_location",
    "event_location_geo",
    "booking_date",
    "booking_time",
    "duration_minutes",
    "parking_info",
    "notes",
    "price",
    "quantity",
    "custom_fields",
    "addon_ids",
    "apply_cbd_fee",
    "company_website",
  ]);

  for (const key of Object.keys(body || {})) {
    if (!allowedKeys.has(key)) {
      return reject(request, 400, `Unexpected field: ${key}`, "unexpected_field");
    }
  }

  const businessId = body?.business_id ? String(body.business_id) : null;

  if (!businessId) {
    return reject(request, 400, "business_id is required", "missing_business_id");
  }

  const customerName = String(body?.customer_name || "").trim();
  if (!customerName) {
    return reject(request, 400, "customer_name is required", "missing_customer_name");
  }

  const bookingDateStr = String(body?.booking_date || "").trim();
  const bookingTimeStr = String(body?.booking_time || "").trim();
  if (!bookingDateStr || !isYmd(bookingDateStr)) {
    return reject(request, 400, "booking_date is required (YYYY-MM-DD)", "invalid_booking_date");
  }
  if (!bookingTimeStr || !isHm(bookingTimeStr)) {
    return reject(request, 400, "booking_time is required (HH:MM)", "invalid_booking_time");
  }

  const customerEmail = String(body?.customer_email || "").trim();
  if (!isValidEmail(customerEmail)) {
    return reject(request, 400, "Invalid customer_email", "invalid_customer_email");
  }

  if (body?.customer_phone && !isValidPhone(body.customer_phone)) {
    return reject(
      request,
      400,
      "Invalid phone number. Enter 10 digits or include country code (e.g. +61412345678).",
      "invalid_phone",
    );
  }

  const eventDate = new Date(`${bookingDateStr}T${bookingTimeStr}:00`);
  if (Number.isNaN(eventDate.getTime())) {
    return reject(request, 400, "Invalid booking date/time", "invalid_datetime");
  }
  if (eventDate.getTime() <= Date.now()) {
    return reject(request, 400, "booking_date must be in the future", "past_booking_date");
  }

  const sb = supabaseAdmin();
  const { data: business, error: businessError } = await sb
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) {
    console.error(`[reject] POST /api/bookings ip=${getClientIp(request)} reason=business_lookup_failed`);
    return NextResponse.json({ detail: businessError.message }, { status: 500 });
  }
  if (!business) return reject(request, 404, "Business not found", "business_not_found");

  if (!hasProAccess(business)) {
    const { startIso, endIso } = monthRangeUtc(new Date());
    const { count, error: countError } = await sb
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (countError) return NextResponse.json({ detail: countError.message }, { status: 500 });
    if ((count || 0) >= FREE_PLAN_MAX_BOOKINGS_PER_MONTH) {
      return reject(
        request,
        403,
        `Free plan limit reached (${FREE_PLAN_MAX_BOOKINGS_PER_MONTH} bookings this month). Upgrade to Pro to add more bookings.`,
        "free_plan_limit",
      );
    }
  }

  const invoiceDate = new Date();
  const { data: invoiceRows, error: invoiceError } = await sb.rpc("next_invoice_id", {
    p_business_id: businessId,
  });
  if (invoiceError) return NextResponse.json({ detail: invoiceError.message }, { status: 500 });
  const invoice_id = invoiceRows?.[0]?.invoice_id || null;

  const custom_fields = normalizeCustomFields(body?.custom_fields);
  const customerPhone = body?.customer_phone ? normalizePhone(body.customer_phone) : "";
  const travel = await computeTravelFee({ business, body });
  const bodyWithComputed = {
    ...body,
    _computed_travel_fee: travel?.lineItem || null,
  };
  const addon_ids = normalizeAddonIds(body?.addon_ids);
  let addons = [];
  if (addon_ids.length) {
    const { data } = await sb
      .from("service_addons")
      .select("id,name,price")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .in("id", addon_ids);
    addons = Array.isArray(data) ? data : [];
  }

  const { line_items, total_amount } = buildLineItemsAndTotal({ body: bodyWithComputed, business, addons });

  const booking = {
    id: randomUUID(),
    business_id: businessId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    service_type: String(body?.service_type || "Service"),
    booth_type: body?.booth_type ? String(body.booth_type) : "",
    package_duration: body?.package_duration ? String(body.package_duration) : "",
    event_location: body?.event_location ? String(body.event_location) : "",
    booking_date: bookingDateStr ? bookingDateStr : null,
    booking_time: bookingTimeStr ? bookingTimeStr : null,
    end_time: null,
    duration_minutes: Number(body?.duration_minutes || 60),
    parking_info: body?.parking_info ? String(body.parking_info) : "",
    notes: body?.notes ? String(body.notes) : "",
    price: body?.price !== undefined && body?.price !== "" ? Number(body.price) : 0,
    quantity: body?.quantity !== undefined ? Number(body.quantity) : 1,
    line_items,
    total_amount,
    distance_km: travel?.distance_km ?? null,
    travel_km_billable: travel?.travel_km_billable ?? null,
    travel_fee_amount: travel?.travel_fee_amount ?? null,
    status: "confirmed",
    payment_status: "unpaid",
    payment_method: "",
    invoice_id,
    invoice_date: invoiceDate.toISOString(),
    due_date: dueDateIsoFromBookingDate(bookingDateStr) || invoiceDate.toISOString(),
    custom_fields,
    confirmation_sent_at: null,
    business_notice_sent_at: null,
    reminder_5d_sent_at: null,
    reminder_1d_sent_at: null,
    reminder_5d_scheduled_at: null,
    reminder_1d_scheduled_at: null,
    reminder_sent_hours: [],
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await sb
    .from("bookings")
    .insert(booking)
    .select("*")
    .maybeSingle();
  if (insertError || !inserted) return NextResponse.json({ detail: insertError?.message || "Failed to create booking" }, { status: 500 });

  // booking_count is informational; don't fail booking creation if this increment fails.
  await sb
    .from("businesses")
    .update({ booking_count: Number(business.booking_count || 0) + 1 })
    .eq("id", businessId);

  // Best-effort: send confirmation + invoice to customer and business.
  try {
    const template = await getActiveInvoiceTemplateSupabase(sb, businessId);
    const { data: fieldDefs } = await sb
      .from("booking_form_fields")
      .select("field_key,field_name,is_private")
      .eq("business_id", businessId);
    const emailResults = await sendBookingCreatedEmails({ booking: inserted, business, template, fieldDefs: fieldDefs || [] });
    const updates = {};
    if (emailResults?.customer?.ok) updates.confirmation_sent_at = new Date().toISOString();
    if (emailResults?.business?.ok) updates.business_notice_sent_at = new Date().toISOString();

    const scheduled = await scheduleBookingRemindersViaResend({ booking: inserted, business });
    if (scheduled?.ok && scheduled?.scheduled) {
      if (scheduled.scheduled.reminder_5d_scheduled_at) updates.reminder_5d_scheduled_at = scheduled.scheduled.reminder_5d_scheduled_at;
      if (scheduled.scheduled.reminder_1d_scheduled_at) updates.reminder_1d_scheduled_at = scheduled.scheduled.reminder_1d_scheduled_at;
    }

    if (Object.keys(updates).length) {
      await sb.from("bookings").update(updates).eq("id", inserted.id).eq("business_id", businessId);
    }
  } catch {
    // ignore email failures
  }

  return NextResponse.json(inserted);
}

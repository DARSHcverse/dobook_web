import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { scheduleBookingRemindersViaResend, sendBookingCreatedEmails } from "@/lib/bookingMailer";
import { hasProAccess } from "@/lib/entitlements";
import { createCalendarEvent } from "@/lib/googleCalendar";
import { sendSMS, formatSMSDate, formatSMSTime } from "@/lib/sms";
import { bookingConfirmationSMS } from "@/lib/smsTemplates";
import { isValidPhone, normalizePhone, phoneValidationHint } from "@/lib/phone";
import { formatMoney } from "@/lib/money";
import { formatDistance, distanceUnitLabel } from "@/lib/distance";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { pickExistingPublicColumns } from "@/lib/dbSchema";
import {
  drivingDistanceKmGeoapify,
  extractLatLonFromAutocompleteItem,
  geocodeAddressGeoapify,
  haversineDistanceKm,
} from "@/lib/geoapify";

const FREE_PLAN_MAX_BOOKINGS_PER_MONTH = 50;

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
    extractPostcodeFromAddressString(body?.event_location || body?.full_address || "")
  );
}

function formatHours(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
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

function normalizeCustomFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const key = String(k || "").trim();
    if (!key || v === undefined) continue;
    out[key] = v === null ? "" : v;
  }
  return out;
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

function buildCbdLineItem({ business, body }) {
  const cbdEnabled = Boolean(business?.cbd_fee_enabled);
  const cbdAmount = asMoney(business?.cbd_fee_amount);
  if (!cbdEnabled || cbdAmount <= 0) return null;

  const eventPostcode = resolveEventPostcode(body);
  if (eventPostcode !== "3000") return null;

  const cbdLabel = String(business?.cbd_fee_label || "CBD logistics").trim() || "CBD logistics";
  return {
    description: cbdLabel,
    qty: 1,
    unit_price: cbdAmount,
    total: cbdAmount,
  };
}

function buildDirectLineItemsAndTotal({ body, business, addons = [] }) {
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

  const travel = body?._computed_travel_fee;
  if (travel?.amount && travel.amount > 0) {
    items.push({
      description: travel.description || "Travel charge",
      qty: Number(travel.qty || 1),
      unit_price: asMoney(travel.unit_price),
      total: asMoney(travel.amount),
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

  const cbdLineItem = buildCbdLineItem({ business, body });
  if (cbdLineItem) items.push(cbdLineItem);

  const totalAmount = asMoney(items.reduce((sum, item) => sum + asMoney(item?.total), 0));
  return { line_items: items, total_amount: totalAmount };
}

function buildPackageLineItemsAndTotal({ body, business, pkg, addons = [], travel }) {
  const packageName = String(pkg?.name || body?.service_type || "Package").trim() || "Package";
  const basePrice = asMoney(pkg?.price);
  const items = [
    {
      description: packageName,
      qty: 1,
      unit_price: basePrice,
      total: basePrice,
    },
  ];

  if (travel?.lineItem?.amount && travel.lineItem.amount > 0) {
    items.push({
      description: travel.lineItem.description || "Travel charge",
      qty: Number(travel.lineItem.qty || 1),
      unit_price: asMoney(travel.lineItem.unit_price),
      total: asMoney(travel.lineItem.amount),
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

  const cbdLineItem = buildCbdLineItem({ business, body });
  if (cbdLineItem) items.push(cbdLineItem);

  const total_amount = asMoney(items.reduce((sum, item) => sum + asMoney(item?.total), 0));
  return { line_items: items, total_amount };
}

async function computeTravelFee({ business, body }) {
  if (!business) return null;
  if (!Boolean(business?.travel_fee_enabled)) return null;

  const freeKm = Math.max(0, Math.floor(Number(business?.travel_fee_free_km ?? 40)));
  const rate = asMoney(business?.travel_fee_rate_per_km ?? 0.4);
  if (!(rate > 0)) return null;

  const eventAddress = String(body?.event_location || body?.full_address || "").trim();
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
    return {
      distance_km: Math.round(km * 100) / 100,
      travel_km_billable: 0,
      travel_fee_amount: 0,
      lineItem: null,
    };
  }

  const label = String(business?.travel_fee_label || "Travel charge").trim() || "Travel charge";
  const currency = business?.currency || "aud";
  const unit = business?.distance_unit || "km";
  const description = `${label} (${formatDistance(billableKm, unit, { digits: 0 })} @ ${formatMoney(rate, currency)}/${distanceUnitLabel(unit)})`;

  return {
    distance_km: Math.round(km * 100) / 100,
    travel_km_billable: billableKm,
    travel_fee_amount: amount,
    lineItem: { description, qty: billableKm, unit_price: rate, amount },
  };
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
  console.error(`[reject] POST /api/public/bookings ip=${ip} reason=${reason || detail}`);
  return NextResponse.json({ detail }, { status });
}

export async function POST(request) {
  const limited = rateLimit({
    request,
    keyPrefix: "public-bookings",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many requests" }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw || "", "utf8") > 50 * 1024) {
    return reject(request, 413, "Payload too large", "payload_too_large");
  }

  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return reject(request, 400, "Invalid JSON body", "invalid_json");
  }

  if (String(body?.company_website || "").trim()) {
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
    "first_name",
    "last_name",
    "full_address",
    "event_type",
    "num_guests",
    "referral_source",
    "package_id",
    "category_id",
    "category_name",
  ]);

  for (const key of Object.keys(body || {})) {
    if (!allowedKeys.has(key)) {
      return reject(request, 400, `Unexpected field: ${key}`, "unexpected_field");
    }
  }

  const businessId = String(body?.business_id || "").trim();
  if (!businessId) {
    return reject(request, 400, "business_id is required", "missing_business_id");
  }

  const firstName = String(body?.first_name || "").trim();
  const lastName = String(body?.last_name || "").trim();
  const customerName = String(body?.customer_name || "").trim() || [firstName, lastName].filter(Boolean).join(" ");
  if (!customerName) {
    return reject(request, 400, "customer_name is required", "missing_customer_name");
  }

  const customerEmail = String(body?.customer_email || "").trim();
  if (!isValidEmail(customerEmail)) {
    return reject(request, 400, "Invalid customer_email", "invalid_customer_email");
  }

  const bookingDateStr = String(body?.booking_date || "").trim();
  const bookingTimeStr = String(body?.booking_time || "08:00").trim();
  if (!bookingDateStr || !isYmd(bookingDateStr)) {
    return reject(request, 400, "booking_date is required (YYYY-MM-DD)", "invalid_booking_date");
  }
  if (!bookingTimeStr || !isHm(bookingTimeStr)) {
    return reject(request, 400, "booking_time is required (HH:MM)", "invalid_booking_time");
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

  if (businessError) return NextResponse.json({ detail: businessError.message }, { status: 500 });
  if (!business) return reject(request, 404, "Business not found", "business_not_found");

  if (body?.customer_phone && !isValidPhone(body.customer_phone, business?.country_code)) {
    return reject(
      request,
      400,
      `Invalid phone number. ${phoneValidationHint(business?.country_code)}`,
      "invalid_phone",
    );
  }

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

  const packageId = String(body?.package_id || "").trim() || null;
  let pkg = null;
  if (packageId) {
    const { data: pkgData, error: pkgError } = await sb
      .from("packages")
      .select("id,name,price,duration_hours,category_id")
      .eq("id", packageId)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .maybeSingle();
    if (pkgError) return NextResponse.json({ detail: pkgError.message }, { status: 500 });
    if (!pkgData) return reject(request, 400, "Selected package is no longer available", "package_not_found");
    pkg = pkgData;
  }

  const categoryId = String(body?.category_id || pkg?.category_id || "").trim() || null;
  const addon_ids = normalizeAddonIds(body?.addon_ids);

  let addons = [];
  if (addon_ids.length) {
    const { data, error } = await sb
      .from("service_addons")
      .select("id,name,price")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .in("id", addon_ids);
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    addons = Array.isArray(data) ? data : [];
  }

  const custom_fields = normalizeCustomFields(body?.custom_fields);
  const customerPhone = body?.customer_phone ? normalizePhone(body.customer_phone) : "";
  const invoiceDate = new Date();
  const { data: invoiceRows, error: invoiceError } = await sb.rpc("next_invoice_id", {
    p_business_id: businessId,
  });
  if (invoiceError) return NextResponse.json({ detail: invoiceError.message }, { status: 500 });
  const invoice_id = invoiceRows?.[0]?.invoice_id || null;

  const travel = await computeTravelFee({ business, body });
  const bodyWithComputed = { ...body, _computed_travel_fee: travel?.lineItem || null };

  const directServiceType = String(body?.service_type || "Service").trim() || "Service";
  const directBoothType = String(body?.booth_type || "").trim();
  const directPackageDuration = String(body?.package_duration || "").trim();
  const directDurationMinutes = Math.max(1, Number(body?.duration_minutes || 60));

  const service_type = pkg?.name || directServiceType;
  const booth_type = String(body?.category_name || directBoothType).trim();
  const packageHours = formatHours(pkg?.duration_hours);
  const packageDuration =
    packageHours ? `${packageHours} ${Number(packageHours) === 1 ? "Hour" : "Hours"}` : directPackageDuration;
  const duration_minutes = pkg?.duration_hours
    ? Math.max(1, Math.round(Number(pkg.duration_hours) * 60))
    : directDurationMinutes;

  const pricing = pkg
    ? buildPackageLineItemsAndTotal({ body, business, pkg, addons, travel })
    : buildDirectLineItemsAndTotal({ body: bodyWithComputed, business, addons });

  const booking = {
    id: randomUUID(),
    business_id: businessId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    service_type,
    booth_type,
    package_duration: packageDuration,
    event_location: String(body?.event_location || body?.full_address || "").trim(),
    booking_date: bookingDateStr,
    booking_time: bookingTimeStr,
    end_time: null,
    duration_minutes,
    parking_info: String(body?.parking_info || "").trim(),
    notes: String(body?.notes || "").trim(),
    price: pkg ? asMoney(pkg.price) : asMoney(body?.price),
    quantity: pkg ? 1 : Math.max(1, Number(body?.quantity || 1)),
    line_items: pricing.line_items,
    total_amount: pricing.total_amount,
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
    package_id: packageId,
    category_id: categoryId,
    is_enquiry: false,
    event_type: String(body?.event_type || "").trim(),
    num_guests: body?.num_guests ? Number(body.num_guests) : null,
    referral_source: String(body?.referral_source || "").trim(),
    created_at: new Date().toISOString(),
  };

  const bookingForInsert = await pickExistingPublicColumns(sb, "bookings", booking, {
    logPrefix: "[public/bookings/POST]",
  });

  const { data: inserted, error: insertError } = await sb
    .from("bookings")
    .insert(bookingForInsert)
    .select("*")
    .maybeSingle();
  if (insertError || !inserted) {
    return NextResponse.json({ detail: insertError?.message || "Failed to create booking" }, { status: 500 });
  }

  await sb
    .from("businesses")
    .update({ booking_count: Number(business.booking_count || 0) + 1 })
    .eq("id", businessId);

  try {
    const template = await getActiveInvoiceTemplateSupabase(sb, businessId);
    const { data: fieldDefs } = await sb
      .from("booking_form_fields")
      .select("field_key,field_name,is_private")
      .eq("business_id", businessId);

    const emailResults = await sendBookingCreatedEmails({
      booking: inserted,
      business,
      template,
      fieldDefs: fieldDefs || [],
    });

    const updates = {};
    if (emailResults?.customer?.ok) updates.confirmation_sent_at = new Date().toISOString();
    if (emailResults?.business?.ok) updates.business_notice_sent_at = new Date().toISOString();

    const scheduled = await scheduleBookingRemindersViaResend({ booking: inserted, business });
    if (scheduled?.ok && scheduled?.scheduled) {
      if (scheduled.scheduled.reminder_5d_scheduled_at) {
        updates.reminder_5d_scheduled_at = scheduled.scheduled.reminder_5d_scheduled_at;
      }
      if (scheduled.scheduled.reminder_1d_scheduled_at) {
        updates.reminder_1d_scheduled_at = scheduled.scheduled.reminder_1d_scheduled_at;
      }
    }

    if (Object.keys(updates).length) {
      await sb.from("bookings").update(updates).eq("id", inserted.id).eq("business_id", businessId);
    }
  } catch {
    // ignore email/reminder failures
  }

  if (hasProAccess(business) && business.sms_confirmations_enabled !== false && inserted.customer_phone) {
    setTimeout(() => {
      (async () => {
        try {
          const sid = await sendSMS({
            to: inserted.customer_phone,
            message: bookingConfirmationSMS({
              customerName: inserted.customer_name,
              businessName: business.business_name,
              service: inserted.service_type || inserted.booth_type,
              date: formatSMSDate(inserted.booking_date),
              time: formatSMSTime(inserted.booking_time),
            }),
          });
          if (sid) {
            await sb
              .from("bookings")
              .update({ sms_confirmation_sent_at: new Date().toISOString() })
              .eq("id", inserted.id);
          }
        } catch (e) {
          console.error(`[public/bookings/POST] SMS confirmation failed for booking ${inserted.id}:`, e?.message);
        }
      })().catch((e) => {
        console.error(`[public/bookings/POST] SMS background task failed for booking ${inserted.id}:`, e?.message);
      });
    }, 0);
  }

  setTimeout(() => {
    createCalendarEvent(businessId, inserted).catch((e) => {
      console.error(`[public/bookings/POST] Google Calendar sync failed for booking ${inserted.id}:`, e?.message);
    });
  }, 0);

  return NextResponse.json(inserted);
}

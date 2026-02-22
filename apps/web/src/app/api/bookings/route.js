import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "../_utils/auth";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";
import { scheduleBookingRemindersViaResend, sendBookingCreatedEmails } from "@/lib/bookingMailer";
import { hasProAccess } from "@/lib/entitlements";
import { isValidPhone, normalizePhone } from "@/lib/phone";

const FREE_PLAN_MAX_BOOKINGS_PER_MONTH = 10;

function asBool(value) {
  if (value === true || value === false) return value;
  const s = String(value || "").trim().toLowerCase();
  if (!s) return false;
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function asMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function formatHours(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function buildLineItemsAndTotal({ body, business }) {
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

  const travelEnabled = Boolean(business?.travel_fee_enabled);
  const travelLabel = String(business?.travel_fee_label || "Travel fee").trim() || "Travel fee";
  const travelAmount = asMoney(business?.travel_fee_amount);
  const applyTravel = asBool(body?.apply_travel_fee);
  if (travelEnabled && travelAmount > 0 && applyTravel) {
    items.push({
      description: travelLabel,
      qty: 1,
      unit_price: travelAmount,
      total: travelAmount,
    });
  }

  const cbdEnabled = Boolean(business?.cbd_fee_enabled);
  const cbdLabel = String(business?.cbd_fee_label || "CBD logistics").trim() || "CBD logistics";
  const cbdAmount = asMoney(business?.cbd_fee_amount);
  const applyCbd = asBool(body?.apply_cbd_fee);
  if (cbdEnabled && cbdAmount > 0 && applyCbd) {
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

function formatYYYYMMDD(date) {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
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

function isLikelyEmail(value) {
  const s = String(value || "").trim();
  if (!s) return true;
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

function getActiveInvoiceTemplateLocal(db, businessId) {
  const list = Array.isArray(db?.invoiceTemplates) ? db.invoiceTemplates : [];
  const mine = list.filter((t) => t.business_id === businessId);
  mine.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  return mine[0] || null;
}

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  if (auth.mode === "supabase") {
    const { data, error } = await auth.supabase
      .from("bookings")
      .select("*")
      .eq("business_id", auth.business.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  const bookings = auth.db.bookings.filter((b) => b.business_id === auth.business.id);
  return NextResponse.json(bookings);
}

export async function POST(request) {
  const body = await request.json();
  const businessId = body?.business_id ? String(body.business_id) : null;

  if (!businessId) {
    return NextResponse.json({ detail: "business_id is required" }, { status: 400 });
  }

  const customerName = String(body?.customer_name || "").trim();
  if (!customerName) {
    return NextResponse.json({ detail: "customer_name is required" }, { status: 400 });
  }

  const bookingDateStr = String(body?.booking_date || "").trim();
  const bookingTimeStr = String(body?.booking_time || "").trim();
  if (!bookingDateStr || !isYmd(bookingDateStr)) {
    return NextResponse.json({ detail: "booking_date is required (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!bookingTimeStr || !isHm(bookingTimeStr)) {
    return NextResponse.json({ detail: "booking_time is required (HH:MM)" }, { status: 400 });
  }

  const customerEmail = String(body?.customer_email || "").trim();
  if (!isLikelyEmail(customerEmail)) {
    return NextResponse.json({ detail: "Invalid customer_email" }, { status: 400 });
  }

  if (body?.customer_phone && !isValidPhone(body.customer_phone)) {
    return NextResponse.json(
      { detail: "Invalid phone number. Enter 10 digits or include country code (e.g. +61412345678)." },
      { status: 400 },
    );
  }

  if (hasSupabaseConfig()) {
    const sb = supabaseAdmin();
    const { data: business, error: businessError } = await sb
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();
    if (businessError) return NextResponse.json({ detail: businessError.message }, { status: 500 });
    if (!business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

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
        return NextResponse.json(
          {
            detail: `Free plan limit reached (${FREE_PLAN_MAX_BOOKINGS_PER_MONTH} bookings this month). Upgrade to Pro to add more bookings.`,
          },
          { status: 403 },
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
    const { line_items, total_amount } = buildLineItemsAndTotal({ body, business });

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
      status: "confirmed",
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
      const emailResults = await sendBookingCreatedEmails({ booking: inserted, business, template });
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

  const db = readDb();
  const business = db.businesses.find((b) => b.id === businessId);
  if (!business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

  if (!hasProAccess(business)) {
    const { startIso, endIso } = monthRangeUtc(new Date());
    const count = (db.bookings || []).filter((b) => {
      if (b.business_id !== businessId) return false;
      const created = b.created_at ? new Date(b.created_at) : null;
      if (!created || Number.isNaN(created.getTime())) return false;
      return created.toISOString() >= startIso && created.toISOString() < endIso;
    }).length;
    if (count >= FREE_PLAN_MAX_BOOKINGS_PER_MONTH) {
      return NextResponse.json(
        {
          detail: `Free plan limit reached (${FREE_PLAN_MAX_BOOKINGS_PER_MONTH} bookings this month). Upgrade to Pro to add more bookings.`,
        },
        { status: 403 },
      );
    }
  }

  const invoiceDate = new Date();
  const nextSeq = Number(business.invoice_seq || 0) + 1;
  business.invoice_seq = nextSeq;
  const invoice_id = `PB-${formatYYYYMMDD(invoiceDate)}-${String(nextSeq).padStart(3, "0")}`;
  const customerPhone = body?.customer_phone ? normalizePhone(body.customer_phone) : "";
  const { line_items, total_amount } = buildLineItemsAndTotal({ body, business });

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
    booking_date: bookingDateStr,
    booking_time: bookingTimeStr,
    end_time: null,
    duration_minutes: Number(body?.duration_minutes || 60),
    parking_info: body?.parking_info ? String(body.parking_info) : "",
    notes: body?.notes ? String(body.notes) : "",
    price: body?.price !== undefined && body?.price !== "" ? Number(body.price) : 0,
    quantity: body?.quantity !== undefined ? Number(body.quantity) : 1,
    line_items,
    total_amount,
    status: "confirmed",
    invoice_id,
    invoice_date: invoiceDate.toISOString(),
    due_date: dueDateIsoFromBookingDate(bookingDateStr) || invoiceDate.toISOString(),
    custom_fields: normalizeCustomFields(body?.custom_fields),
    confirmation_sent_at: null,
    business_notice_sent_at: null,
    reminder_5d_sent_at: null,
    reminder_1d_sent_at: null,
    reminder_5d_scheduled_at: null,
    reminder_1d_scheduled_at: null,
    created_at: new Date().toISOString(),
  };

  db.bookings.push(booking);
  business.booking_count = Number(business.booking_count || 0) + 1;

  writeDb(db);

  try {
    const template = getActiveInvoiceTemplateLocal(db, businessId);
    const emailResults = await sendBookingCreatedEmails({ booking, business, template });
    const now = new Date().toISOString();
    if (emailResults?.customer?.ok) booking.confirmation_sent_at = now;
    if (emailResults?.business?.ok) booking.business_notice_sent_at = now;

    const scheduled = await scheduleBookingRemindersViaResend({ booking, business });
    if (scheduled?.ok && scheduled?.scheduled) {
      if (scheduled.scheduled.reminder_5d_scheduled_at) booking.reminder_5d_scheduled_at = scheduled.scheduled.reminder_5d_scheduled_at;
      if (scheduled.scheduled.reminder_1d_scheduled_at) booking.reminder_1d_scheduled_at = scheduled.scheduled.reminder_1d_scheduled_at;
    }
    writeDb(db);
  } catch {
    // ignore email failures
  }

  return NextResponse.json(booking);
}

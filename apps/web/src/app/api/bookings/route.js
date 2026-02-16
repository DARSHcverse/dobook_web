import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "../_utils/auth";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingCreatedEmails } from "@/lib/bookingMailer";
import { hasProAccess } from "@/lib/entitlements";

const FREE_PLAN_MAX_BOOKINGS_PER_MONTH = 10;

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

    const bookingDateStr = String(body?.booking_date || "").trim();
    const bookingTimeStr = String(body?.booking_time || "").trim();
    const custom_fields = normalizeCustomFields(body?.custom_fields);

    const booking = {
      id: randomUUID(),
      business_id: businessId,
      customer_name: String(body?.customer_name || ""),
      customer_email: String(body?.customer_email || ""),
      customer_phone: body?.customer_phone ? String(body.customer_phone) : "",
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
      status: "confirmed",
      invoice_id,
      invoice_date: invoiceDate.toISOString(),
      due_date: dueDateIsoFromBookingDate(bookingDateStr) || invoiceDate.toISOString(),
      custom_fields,
      confirmation_sent_at: null,
      business_notice_sent_at: null,
      reminder_5d_sent_at: null,
      reminder_1d_sent_at: null,
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

  const booking = {
    id: randomUUID(),
    business_id: businessId,
    customer_name: String(body?.customer_name || ""),
    customer_email: String(body?.customer_email || ""),
    customer_phone: body?.customer_phone ? String(body.customer_phone) : "",
    service_type: String(body?.service_type || "Service"),
    booth_type: body?.booth_type ? String(body.booth_type) : "",
    package_duration: body?.package_duration ? String(body.package_duration) : "",
    event_location: body?.event_location ? String(body.event_location) : "",
    booking_date: String(body?.booking_date || ""),
    booking_time: String(body?.booking_time || ""),
    end_time: null,
    duration_minutes: Number(body?.duration_minutes || 60),
    parking_info: body?.parking_info ? String(body.parking_info) : "",
    notes: body?.notes ? String(body.notes) : "",
    price: body?.price !== undefined && body?.price !== "" ? Number(body.price) : 0,
    quantity: body?.quantity !== undefined ? Number(body.quantity) : 1,
    status: "confirmed",
    invoice_id,
    invoice_date: invoiceDate.toISOString(),
    due_date: dueDateIsoFromBookingDate(body?.booking_date) || invoiceDate.toISOString(),
    custom_fields: normalizeCustomFields(body?.custom_fields),
    confirmation_sent_at: null,
    business_notice_sent_at: null,
    reminder_5d_sent_at: null,
    reminder_1d_sent_at: null,
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
    writeDb(db);
  } catch {
    // ignore email failures
  }

  return NextResponse.json(booking);
}

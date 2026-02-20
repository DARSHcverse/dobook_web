import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { sendBookingCancelledEmail } from "@/lib/bookingMailer";

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

function buildUpdates(body) {
  const updates = {};
  const fields = [
    "customer_name",
    "customer_email",
    "customer_phone",
    "service_type",
    "booth_type",
    "package_duration",
    "event_location",
    "booking_date",
    "booking_time",
    "duration_minutes",
    "parking_info",
    "notes",
    "price",
    "quantity",
    "status",
  ];

  for (const key of fields) {
    if (!(key in (body || {}))) continue;
    if (key === "duration_minutes" || key === "quantity") updates[key] = Number(body[key] || 0);
    else if (key === "price") updates[key] = body[key] !== "" && body[key] !== null ? Number(body[key] || 0) : 0;
    else if (key === "booking_date" || key === "booking_time") {
      const v = body[key];
      updates[key] = v === null || v === undefined || String(v).trim() === "" ? null : String(v).trim();
    } else {
      updates[key] = body[key] === null || body[key] === undefined ? "" : String(body[key]);
    }
  }

  if ("custom_fields" in (body || {})) {
    updates.custom_fields = normalizeCustomFields(body.custom_fields);
  }

  return updates;
}

export async function GET(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId is required" }, { status: 400 });

  if (auth.mode === "supabase") {
    const { data, error } = await auth.supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("business_id", auth.business.id)
      .maybeSingle();
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  const booking = auth.db.bookings.find((b) => b.id === bookingId && b.business_id === auth.business.id);
  if (!booking) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });
  return NextResponse.json(booking);
}

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId is required" }, { status: 400 });

  const body = await request.json();
  const updates = buildUpdates(body);
  if (!Object.keys(updates).length) return NextResponse.json({ detail: "No updates provided" }, { status: 400 });

  if ("customer_email" in updates && !isLikelyEmail(updates.customer_email)) {
    return NextResponse.json({ detail: "Invalid customer_email" }, { status: 400 });
  }

  if ("customer_phone" in updates) {
    if (updates.customer_phone && !isValidPhone(updates.customer_phone)) {
      return NextResponse.json(
        { detail: "Invalid phone number. Enter 10 digits or include country code (e.g. +61412345678)." },
        { status: 400 },
      );
    }
    updates.customer_phone = updates.customer_phone ? normalizePhone(updates.customer_phone) : "";
  }

  if ("booking_date" in updates && updates.booking_date) {
    if (!isYmd(updates.booking_date)) {
      return NextResponse.json({ detail: "Invalid booking_date (YYYY-MM-DD)" }, { status: 400 });
    }
  }
  if ("booking_time" in updates && updates.booking_time) {
    if (!isHm(updates.booking_time)) {
      return NextResponse.json({ detail: "Invalid booking_time (HH:MM)" }, { status: 400 });
    }
  }

  if ("status" in updates) {
    const status = String(updates.status || "").trim().toLowerCase();
    const allowed = new Set(["confirmed", "cancelled"]);
    if (!allowed.has(status)) {
      return NextResponse.json({ detail: "Invalid status" }, { status: 400 });
    }
    updates.status = status;
  }

  if (auth.mode === "supabase") {
    const { data: before, error: beforeErr } = await auth.supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("business_id", auth.business.id)
      .maybeSingle();
    if (beforeErr) return NextResponse.json({ detail: beforeErr.message }, { status: 500 });
    if (!before) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });

    const prevStatus = String(before?.status || "confirmed").trim().toLowerCase();
    const nextStatus = "status" in updates ? String(updates.status || "").trim().toLowerCase() : prevStatus;
    const becameCancelled = prevStatus !== "cancelled" && nextStatus === "cancelled";

    if (becameCancelled) {
      updates.reminder_5d_scheduled_at = null;
      updates.reminder_1d_scheduled_at = null;
    }

    const { data, error } = await auth.supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId)
      .eq("business_id", auth.business.id)
      .select("*")
      .maybeSingle();

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });

    if (becameCancelled) {
      try {
        await sendBookingCancelledEmail({ booking: data, business: auth.business });
      } catch {
        // best-effort
      }
    }

    return NextResponse.json(data);
  }

  const idx = auth.db.bookings.findIndex((b) => b.id === bookingId && b.business_id === auth.business.id);
  if (idx === -1) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });
  const before = auth.db.bookings[idx];
  const prevStatus = String(before?.status || "confirmed").trim().toLowerCase();
  const nextStatus = "status" in updates ? String(updates.status || "").trim().toLowerCase() : prevStatus;
  const becameCancelled = prevStatus !== "cancelled" && nextStatus === "cancelled";

  const next = { ...before, ...updates };
  if (becameCancelled) {
    next.reminder_5d_scheduled_at = null;
    next.reminder_1d_scheduled_at = null;
  }

  auth.db.bookings[idx] = next;
  auth.saveDb(auth.db);

  if (becameCancelled) {
    try {
      await sendBookingCancelledEmail({ booking: auth.db.bookings[idx], business: auth.business });
    } catch {
      // best-effort
    }
  }
  return NextResponse.json(auth.db.bookings[idx]);
}

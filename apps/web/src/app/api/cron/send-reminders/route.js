import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingReminderEmail } from "@/lib/bookingMailer";
import { hasProAccess, isOwnerBusiness } from "@/lib/entitlements";

function ymd(date) {
  const d = new Date(date);
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysUtc(date, days) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function normalizeReminderTimes(value) {
  const allowed = new Set([1, 2, 4, 12, 24, 48, 72, 168]);
  const list = Array.isArray(value) ? value : [];
  const cleaned = list.map((v) => Number(v)).filter((v) => Number.isFinite(v) && allowed.has(v));
  return Array.from(new Set(cleaned)).slice(0, 3);
}

function parseBookingDateTimeUtc(booking) {
  const dateStr = String(booking?.booking_date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map((n) => Number(n));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

  const timeStr = String(booking?.booking_time || "").trim();
  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, min] = timeStr.split(":").map((n) => Number(n));
    if (Number.isFinite(h) && Number.isFinite(min)) {
      return new Date(Date.UTC(y, m - 1, d, h, min, 0, 0));
    }
  }

  return new Date(Date.UTC(y, m - 1, d, 9, 0, 0, 0));
}

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  const headerSecret = request.headers.get("x-cron-secret") || "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("cron_secret") || "";
  return token === secret || headerSecret === secret || querySecret === secret;
}

export async function GET(request) {
  return POST(request);
}

export async function POST(request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      {
        detail:
          "CRON_SECRET is not set. Either set CRON_SECRET and call this endpoint from a daily cron, or enable Resend scheduling via REMINDERS_SCHEDULE_VIA_RESEND=true.",
      },
      { status: 400 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sb = supabaseAdmin();

  const { data: businesses, error: bizErr } = await sb.from("businesses").select("*");
  if (bizErr) return NextResponse.json({ detail: bizErr.message }, { status: 500 });

  const businessById = new Map((businesses || []).map((b) => [b.id, b]));
  const allTimes = (businesses || [])
    .flatMap((b) =>
      normalizeReminderTimes(
        Array.isArray(b?.reminder_times) && b.reminder_times.length ? b.reminder_times : b?.reminder_timing_hrs,
      ),
    )
    .filter(Boolean);
  const maxHours = allTimes.length ? Math.max(...allTimes) : 48;
  const lookaheadDays = Math.max(1, Math.ceil(maxHours / 24));
  const startDate = ymd(now);
  const endDate = ymd(addDaysUtc(now, lookaheadDays));

  const stats = { startDate, endDate, lookaheadDays, sent: 0, skipped: 0 };

  const { data: bookings, error: bookingsErr } = await sb
    .from("bookings")
    .select("*")
    .gte("booking_date", startDate)
    .lte("booking_date", endDate)
    .eq("status", "confirmed");
  if (bookingsErr) return NextResponse.json({ detail: bookingsErr.message }, { status: 500 });

  const windowMs = 30 * 60 * 1000;

  const process = async (booking) => {
    const business = businessById.get(booking.business_id);
    if (!business || !booking.customer_email) return false;
    const subStatus = String(business?.subscription_status || "").trim().toLowerCase();
    const proActive = hasProAccess(business) && (isOwnerBusiness(business) || subStatus === "active");
    if (!proActive) return false;
    if (business.reminders_enabled === false) return false;

    const reminderTimes = normalizeReminderTimes(
      Array.isArray(business?.reminder_times) && business.reminder_times.length
        ? business.reminder_times
        : business?.reminder_timing_hrs,
    );
    if (!reminderTimes.length) return false;

    const eventAt = parseBookingDateTimeUtc(booking);
    if (!eventAt) return false;

    const sentHours = Array.isArray(booking?.reminder_sent_hours) ? booking.reminder_sent_hours : [];
    const includeDetails = business?.reminder_include_booking_details !== false;
    const includePaymentLink = Boolean(business?.reminder_include_payment_link) && Boolean(String(business?.payment_link || "").trim());
    const customMessage = String(business?.reminder_custom_message || "").trim();

    let sentAny = false;
    for (const hoursBefore of reminderTimes) {
      if (sentHours.includes(hoursBefore)) continue;
      const targetMs = Number(hoursBefore) * 60 * 60 * 1000;
      const deltaMs = eventAt.getTime() - now.getTime();
      if (deltaMs <= 0) continue;
      if (Math.abs(deltaMs - targetMs) > windowMs) continue;

      // eslint-disable-next-line no-await-in-loop
      const result = await sendBookingReminderEmail({
        booking,
        business,
        hoursBefore,
        includeDetails,
        includePaymentLink,
        customMessage,
      });
      if (!result?.ok) continue;

      sentHours.push(hoursBefore);
      sentAny = true;
    }

    if (sentAny) {
      const unique = Array.from(new Set(sentHours));
      await sb
        .from("bookings")
        .update({ reminder_sent_hours: unique })
        .eq("id", booking.id)
        .eq("business_id", booking.business_id);
    }

    return sentAny;
  };

  for (const booking of bookings || []) {
    // eslint-disable-next-line no-await-in-loop
    if (await process(booking)) stats.sent += 1;
    else stats.skipped += 1;
  }

  return NextResponse.json({ ok: true, ...stats });
}

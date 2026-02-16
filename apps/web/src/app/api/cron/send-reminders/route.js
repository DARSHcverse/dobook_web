import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingReminderEmail } from "@/lib/bookingMailer";
import { hasProAccess } from "@/lib/entitlements";

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const date5 = ymd(addDaysUtc(now, 5));
  const date1 = ymd(addDaysUtc(now, 1));

  const stats = { date1, date5, sent_5d: 0, sent_1d: 0, skipped: 0 };

  if (hasSupabaseConfig()) {
    const sb = supabaseAdmin();

    const { data: businesses, error: bizErr } = await sb.from("businesses").select("*");
    if (bizErr) return NextResponse.json({ detail: bizErr.message }, { status: 500 });
    const businessById = new Map((businesses || []).map((b) => [b.id, b]));

    const { data: bookings5, error: b5Err } = await sb
      .from("bookings")
      .select("*")
      .eq("booking_date", date5)
      .eq("status", "confirmed");
    if (b5Err) return NextResponse.json({ detail: b5Err.message }, { status: 500 });

    const { data: bookings1, error: b1Err } = await sb
      .from("bookings")
      .select("*")
      .eq("booking_date", date1)
      .eq("status", "confirmed");
    if (b1Err) return NextResponse.json({ detail: b1Err.message }, { status: 500 });

    const process = async (booking, daysBefore) => {
      const business = businessById.get(booking.business_id);
      if (!business || !booking.customer_email) return false;
      if (!hasProAccess(business)) return false;

      const already =
        daysBefore === 5 ? booking.reminder_5d_sent_at : booking.reminder_1d_sent_at;
      if (already) return false;

      const result = await sendBookingReminderEmail({ booking, business, daysBefore });
      if (!result?.ok) return false;

      const field = daysBefore === 5 ? "reminder_5d_sent_at" : "reminder_1d_sent_at";
      await sb
        .from("bookings")
        .update({ [field]: new Date().toISOString() })
        .eq("id", booking.id)
        .eq("business_id", booking.business_id);
      return true;
    };

    for (const b of bookings5 || []) {
      // eslint-disable-next-line no-await-in-loop
      if (await process(b, 5)) stats.sent_5d += 1;
      else stats.skipped += 1;
    }
    for (const b of bookings1 || []) {
      // eslint-disable-next-line no-await-in-loop
      if (await process(b, 1)) stats.sent_1d += 1;
      else stats.skipped += 1;
    }

    return NextResponse.json({ ok: true, ...stats });
  }

  const db = readDb();
  const businessById = new Map((db.businesses || []).map((b) => [b.id, b]));
  const nowIso = new Date().toISOString();

  const processLocal = async (booking, daysBefore) => {
    const business = businessById.get(booking.business_id);
    if (!business || !booking.customer_email) return false;
    if (!hasProAccess(business)) return false;

    const field = daysBefore === 5 ? "reminder_5d_sent_at" : "reminder_1d_sent_at";
    if (booking[field]) return false;

    const result = await sendBookingReminderEmail({ booking, business, daysBefore });
    if (!result?.ok) return false;

    booking[field] = nowIso;
    return true;
  };

  for (const booking of db.bookings || []) {
    if (booking.status !== "confirmed") continue;
    if (booking.booking_date === date5) {
      // eslint-disable-next-line no-await-in-loop
      if (await processLocal(booking, 5)) stats.sent_5d += 1;
    }
    if (booking.booking_date === date1) {
      // eslint-disable-next-line no-await-in-loop
      if (await processLocal(booking, 1)) stats.sent_1d += 1;
    }
  }

  writeDb(db);
  return NextResponse.json({ ok: true, ...stats });
}

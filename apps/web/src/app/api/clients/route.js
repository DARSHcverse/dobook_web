import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isLikelyEmail(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function bookingTotalAmount(booking) {
  const qty = Math.max(1, Number(booking?.quantity || 1));
  const unit = Number(booking?.price || 0);
  const totalRaw =
    booking?.total_amount !== undefined && booking?.total_amount !== null && booking?.total_amount !== ""
      ? Number(booking.total_amount || 0)
      : unit * qty;
  return Number.isFinite(totalRaw) ? totalRaw : 0;
}

function bookingTimestamp(booking) {
  const dateStr = String(booking?.booking_date || "").trim();
  const timeStr = String(booking?.booking_time || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const withTime = timeStr && /^\d{2}:\d{2}/.test(timeStr) ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`;
    const d = new Date(withTime);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  const created = new Date(booking?.created_at || "");
  if (!Number.isNaN(created.getTime())) return created.getTime();
  return 0;
}

function ymdFromTimestamp(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("bookings")
    .select(
      "id,customer_name,customer_email,customer_phone,booking_date,booking_time,status,price,quantity,total_amount,created_at",
    )
    .eq("business_id", auth.business.id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  const byEmail = new Map();
  const list = Array.isArray(data) ? data : [];

  for (const booking of list) {
    const emailRaw = String(booking?.customer_email || "").trim();
    if (!isLikelyEmail(emailRaw)) continue;
    const email = normalizeEmail(emailRaw);
    const ts = bookingTimestamp(booking);
    const dateKey = booking?.booking_date ? String(booking.booking_date) : ymdFromTimestamp(ts);
    const isCancelled = String(booking?.status || "confirmed").trim().toLowerCase() === "cancelled";

    let entry = byEmail.get(email);
    if (!entry) {
      entry = {
        customer_email: email,
        customer_name: String(booking?.customer_name || "").trim(),
        customer_phone: String(booking?.customer_phone || "").trim(),
        total_bookings: 0,
        total_spent: 0,
        first_booking_date: dateKey || "",
        last_booking_date: dateKey || "",
        _first_ts: ts || 0,
        _last_ts: ts || 0,
      };
      byEmail.set(email, entry);
    }

    entry.total_bookings += 1;
    if (!isCancelled) {
      entry.total_spent += bookingTotalAmount(booking);
    }

    if (ts && (!entry._last_ts || ts > entry._last_ts)) {
      entry._last_ts = ts;
      entry.last_booking_date = dateKey || entry.last_booking_date;
      if (String(booking?.customer_name || "").trim()) {
        entry.customer_name = String(booking.customer_name).trim();
      }
      if (String(booking?.customer_phone || "").trim()) {
        entry.customer_phone = String(booking.customer_phone).trim();
      }
    }

    if (ts && (!entry._first_ts || ts < entry._first_ts)) {
      entry._first_ts = ts;
      entry.first_booking_date = dateKey || entry.first_booking_date;
    }
  }

  const clients = Array.from(byEmail.values()).map((entry) => ({
    customer_email: entry.customer_email,
    customer_name: entry.customer_name,
    customer_phone: entry.customer_phone,
    total_bookings: entry.total_bookings,
    total_spent: Math.round(entry.total_spent * 100) / 100,
    first_booking_date: entry.first_booking_date,
    last_booking_date: entry.last_booking_date,
  }));

  return NextResponse.json({ clients });
}

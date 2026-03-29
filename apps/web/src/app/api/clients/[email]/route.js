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

function escapeLike(value) {
  return String(value || "").replace(/[%_]/g, "\\$&");
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

export async function GET(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const raw = params?.email ? decodeURIComponent(params.email) : "";
  const email = normalizeEmail(raw);
  if (!isLikelyEmail(email)) {
    return NextResponse.json({ detail: "Valid email is required" }, { status: 400 });
  }

  const pattern = escapeLike(email);
  const { data, error } = await auth.supabase
    .from("bookings")
    .select(
      "id,customer_name,customer_email,customer_phone,booking_date,booking_time,booth_type,service_type,status,price,quantity,total_amount,created_at",
    )
    .eq("business_id", auth.business.id)
    .ilike("customer_email", pattern);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  const list = Array.isArray(data) ? data : [];
  if (!list.length) return NextResponse.json({ detail: "Client not found" }, { status: 404 });

  const sorted = list.slice().sort((a, b) => bookingTimestamp(b) - bookingTimestamp(a));
  let totalBookings = 0;
  let totalSpent = 0;
  let firstTs = 0;
  let lastTs = 0;
  let name = "";
  let phone = "";
  let firstDate = "";
  let lastDate = "";

  for (const booking of sorted) {
    totalBookings += 1;
    const isCancelled = String(booking?.status || "confirmed").trim().toLowerCase() === "cancelled";
    if (!isCancelled) {
      totalSpent += bookingTotalAmount(booking);
    }

    const ts = bookingTimestamp(booking);
    const dateKey = booking?.booking_date ? String(booking.booking_date) : ymdFromTimestamp(ts);

    if (!lastTs || ts > lastTs) {
      lastTs = ts;
      lastDate = dateKey || lastDate;
      if (String(booking?.customer_name || "").trim()) {
        name = String(booking.customer_name).trim();
      }
      if (String(booking?.customer_phone || "").trim()) {
        phone = String(booking.customer_phone).trim();
      }
    }

    if (!firstTs || ts < firstTs) {
      firstTs = ts;
      firstDate = dateKey || firstDate;
    }

    if (!name && String(booking?.customer_name || "").trim()) {
      name = String(booking.customer_name).trim();
    }
    if (!phone && String(booking?.customer_phone || "").trim()) {
      phone = String(booking.customer_phone).trim();
    }
  }

  let notes = "";
  let notesUpdatedAt = null;
  try {
    const { data: noteData, error: noteError } = await auth.supabase
      .from("client_notes")
      .select("notes, updated_at")
      .eq("business_id", auth.business.id)
      .eq("customer_email", email)
      .maybeSingle();
    if (noteError) throw noteError;
    if (noteData) {
      notes = String(noteData.notes || "");
      notesUpdatedAt = noteData.updated_at || null;
    }
  } catch (e) {
    const msg = String(e?.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return NextResponse.json(
        { detail: "Supabase table \"client_notes\" is missing. Run migrations to create it." },
        { status: 500 },
      );
    }
    return NextResponse.json({ detail: e?.message || "Failed to load client notes" }, { status: 500 });
  }

  return NextResponse.json({
    client: {
      customer_email: email,
      customer_name: name,
      customer_phone: phone,
      total_bookings: totalBookings,
      total_spent: Math.round(totalSpent * 100) / 100,
      first_booking_date: firstDate,
      last_booking_date: lastDate,
    },
    bookings: sorted,
    notes,
    notes_updated_at: notesUpdatedAt,
  });
}

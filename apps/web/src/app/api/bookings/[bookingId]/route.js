import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";

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

  if (auth.mode === "supabase") {
    const { data, error } = await auth.supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId)
      .eq("business_id", auth.business.id)
      .select("*")
      .maybeSingle();

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  const idx = auth.db.bookings.findIndex((b) => b.id === bookingId && b.business_id === auth.business.id);
  if (idx === -1) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });
  auth.db.bookings[idx] = { ...auth.db.bookings[idx], ...updates };
  auth.saveDb(auth.db);
  return NextResponse.json(auth.db.bookings[idx]);
}

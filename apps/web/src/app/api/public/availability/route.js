import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeDaySlots, dayAvailability, durationFor } from "@/lib/availability";
import { addDays, businessNow, getBusinessAvailability, loadBlockingBookings } from "@/lib/businessAvailability";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/public/availability?business_id=&from=YYYY-MM-DD&days=14&service=
// Returns open dates (and start times in slots mode) for the booking page.
// Only times are returned, never who booked them.
export async function GET(request) {
  const url = new URL(request.url);
  const businessId = String(url.searchParams.get("business_id") || "").trim();
  if (!UUID_RE.test(businessId)) return NextResponse.json({ detail: "business_id is required" }, { status: 400 });
  const days = Math.min(42, Math.max(1, Number(url.searchParams.get("days")) || 14));
  const service = String(url.searchParams.get("service") || "").slice(0, 120);

  const sb = supabaseAdmin();
  const { data: business, error } = await sb.from("businesses").select("*").eq("id", businessId).maybeSingle();
  if (error || !business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

  const avail = getBusinessAvailability(business);
  if (!avail.enabled) {
    return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const nowLocal = businessNow(business);
  const fromParam = String(url.searchParams.get("from") || "");
  const from = DATE_RE.test(fromParam) && fromParam > nowLocal.date ? fromParam : nowLocal.date;
  const to = addDays(from, days - 1);

  let bookings;
  try {
    bookings = await loadBlockingBookings(sb, businessId, from, to);
  } catch (e) {
    console.error("[availability] bookings lookup failed:", e?.message);
    return NextResponse.json({ detail: "Could not load availability" }, { status: 500 });
  }

  const duration = durationFor(avail, service);
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(from, i);
    if (avail.mode === "day") {
      const d = dayAvailability({ avail, date, bookings, nowLocal });
      out.push({ date, available: d.available });
    } else {
      const slots = computeDaySlots({ avail, date, bookings, durationMins: duration, nowLocal });
      out.push({ date, available: slots.length > 0, slots });
    }
  }

  return NextResponse.json(
    { enabled: true, mode: avail.mode, duration_mins: duration, today: nowLocal.date, max_advance_days: avail.max_advance_days, days: out },
    { headers: { "Cache-Control": "no-store" } },
  );
}

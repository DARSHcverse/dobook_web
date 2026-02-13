import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "../_utils/auth";
import { readDb, writeDb } from "@/lib/localdb";

function formatYYYYMMDD(date) {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function GET(request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  const bookings = auth.db.bookings.filter((b) => b.business_id === auth.business.id);
  return NextResponse.json(bookings);
}

export async function POST(request) {
  const body = await request.json();
  const businessId = body?.business_id ? String(body.business_id) : null;

  if (!businessId) {
    return NextResponse.json({ detail: "business_id is required" }, { status: 400 });
  }

  const db = readDb();
  const business = db.businesses.find((b) => b.id === businessId);
  if (!business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

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
    end_time: body?.end_time ? String(body.end_time) : "",
    duration_minutes: Number(body?.duration_minutes || 60),
    parking_info: body?.parking_info ? String(body.parking_info) : "",
    notes: body?.notes ? String(body.notes) : "",
    price: body?.price !== undefined && body?.price !== "" ? Number(body.price) : 0,
    quantity: body?.quantity !== undefined ? Number(body.quantity) : 1,
    status: "confirmed",
    invoice_id,
    invoice_date: invoiceDate.toISOString(),
    due_date: new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  db.bookings.push(booking);
  business.booking_count = Number(business.booking_count || 0) + 1;

  writeDb(db);
  return NextResponse.json(booking);
}

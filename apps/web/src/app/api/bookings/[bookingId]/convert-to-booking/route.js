import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/app/api/_utils/auth";
import { sendBookingCreatedEmails } from "@/lib/bookingMailer";

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId required" }, { status: 400 });

  const sb = auth.supabase;
  const businessId = auth.business.id;

  const { data: enquiry, error: fetchErr } = await sb
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .eq("is_enquiry", true)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ detail: fetchErr.message }, { status: 500 });
  if (!enquiry) return NextResponse.json({ detail: "Enquiry not found" }, { status: 404 });
  if (enquiry.enquiry_status === "converted") {
    return NextResponse.json({ detail: "Enquiry already converted" }, { status: 400 });
  }

  const finalPrice =
    enquiry.quoted_price != null ? Number(enquiry.quoted_price) : Number(enquiry.total_amount || 0);

  const bookingRow = {
    id: randomUUID(),
    business_id: businessId,
    customer_name: enquiry.customer_name,
    customer_email: enquiry.customer_email,
    customer_phone: enquiry.customer_phone,
    service_type: enquiry.service_type,
    booth_type: enquiry.booth_type,
    package_duration: enquiry.package_duration,
    event_location: enquiry.event_location,
    booking_date: enquiry.booking_date,
    booking_time: enquiry.booking_time,
    duration_minutes: enquiry.duration_minutes,
    notes: enquiry.notes,
    parking_info: enquiry.parking_info || "",
    price: finalPrice,
    quantity: 1,
    line_items: enquiry.line_items || [],
    total_amount: finalPrice,
    status: "confirmed",
    payment_status: "unpaid",
    payment_method: "",
    invoice_id: null,
    invoice_date: null,
    due_date: null,
    custom_fields: enquiry.custom_fields || {},
    package_id: enquiry.package_id || null,
    category_id: enquiry.category_id || null,
    is_enquiry: false,
    enquiry_status: null,
    event_type: enquiry.event_type || "",
    num_guests: enquiry.num_guests || null,
    referral_source: enquiry.referral_source || "",
    converted_from_enquiry_id: enquiry.id,
    created_at: new Date().toISOString(),
  };

  let inserted = null;
  let insErr = null;
  {
    const res = await sb.from("bookings").insert(bookingRow).select("*").maybeSingle();
    inserted = res.data;
    insErr = res.error;
  }

  if (insErr && /converted_from_enquiry_id/i.test(insErr.message || "")) {
    const { converted_from_enquiry_id, ...fallback } = bookingRow;
    const retry = await sb.from("bookings").insert(fallback).select("*").maybeSingle();
    inserted = retry.data;
    insErr = retry.error;
  }

  if (insErr || !inserted) {
    return NextResponse.json(
      { detail: insErr?.message || "Failed to create booking" },
      { status: 500 },
    );
  }

  const { error: updateErr } = await sb
    .from("bookings")
    .update({ enquiry_status: "converted" })
    .eq("id", enquiry.id)
    .eq("business_id", businessId);

  if (updateErr) {
    console.error("[convert-to-booking] failed to mark enquiry converted:", updateErr.message);
  }

  try {
    await sendBookingCreatedEmails({ booking: inserted, business: auth.business });
  } catch (e) {
    console.error("[convert-to-booking] Email error:", e?.message);
  }

  return NextResponse.json({ ok: true, booking: inserted, enquiry_id: enquiry.id });
}

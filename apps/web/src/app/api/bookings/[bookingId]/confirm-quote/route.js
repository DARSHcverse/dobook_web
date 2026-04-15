import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public endpoint – customer confirms the quote sent to them
export async function PUT(request, { params }) {
  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId required" }, { status: 400 });

  const sb = supabaseAdmin();

  const { data: booking, error: fetchErr } = await sb
    .from("bookings")
    .select("id,business_id,enquiry_status,is_enquiry")
    .eq("id", bookingId)
    .eq("is_enquiry", true)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ detail: fetchErr.message }, { status: 500 });
  if (!booking) return NextResponse.json({ detail: "Enquiry not found" }, { status: 404 });
  if (booking.enquiry_status !== "quoted") {
    return NextResponse.json({ detail: "Enquiry is not in quoted status" }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await sb
    .from("bookings")
    .update({ enquiry_status: "confirmed" })
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();

  if (updateErr) return NextResponse.json({ detail: updateErr.message }, { status: 500 });

  return NextResponse.json(updated);
}

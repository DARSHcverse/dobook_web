import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId required" }, { status: 400 });

  const sb = auth.supabase;
  const businessId = auth.business.id;

  const { data: booking, error: fetchErr } = await sb
    .from("bookings")
    .select("id,business_id,is_enquiry")
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ detail: fetchErr.message }, { status: 500 });
  if (!booking) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });

  const { data, error } = await sb
    .from("bookings")
    .update({
      is_enquiry: false,
      enquiry_status: "confirmed",
      status: "confirmed",
    })
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

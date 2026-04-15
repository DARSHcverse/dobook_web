import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { sendDeclineEmail } from "@/lib/bookingMailer";

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId required" }, { status: 400 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const sb = auth.supabase;
  const businessId = auth.business.id;

  const { data: booking, error: fetchErr } = await sb
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .eq("is_enquiry", true)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ detail: fetchErr.message }, { status: 500 });
  if (!booking) return NextResponse.json({ detail: "Enquiry not found" }, { status: 404 });

  const { data: updated, error: updateErr } = await sb
    .from("bookings")
    .update({ enquiry_status: "declined", quote_message: String(body?.message || "").trim() })
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .select("*")
    .maybeSingle();

  if (updateErr) return NextResponse.json({ detail: updateErr.message }, { status: 500 });

  try {
    await sendDeclineEmail({ booking: updated, business: auth.business, message: body?.message });
  } catch (e) {
    console.error("[bookings/decline] Email error:", e?.message);
  }

  return NextResponse.json(updated);
}

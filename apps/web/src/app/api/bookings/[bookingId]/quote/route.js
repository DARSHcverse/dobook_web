import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { sendQuoteEmail } from "@/lib/bookingMailer";

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId required" }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const quotedPrice = body?.quoted_price !== undefined ? Number(body.quoted_price) : null;
  const quoteMessage = String(body?.quote_message || "").trim();

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

  const updates = {
    enquiry_status: "quoted",
    quoted_price: quotedPrice,
    quote_message: quoteMessage,
  };

  const { data: updated, error: updateErr } = await sb
    .from("bookings")
    .update(updates)
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .select("*")
    .maybeSingle();

  if (updateErr) return NextResponse.json({ detail: updateErr.message }, { status: 500 });

  // Send quote email to customer best-effort
  try {
    await sendQuoteEmail({ booking: updated, business: auth.business, quotedPrice, quoteMessage });
  } catch (e) {
    console.error("[bookings/quote] Email error:", e?.message);
  }

  return NextResponse.json(updated);
}

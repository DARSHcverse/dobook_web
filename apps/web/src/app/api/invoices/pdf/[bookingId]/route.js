import { NextResponse } from "next/server";
import { requireSession } from "../../../_utils/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateInvoicePdfBase64 } from "@/lib/invoicePdf";

export const runtime = "nodejs";

async function getActiveInvoiceTemplateSupabase(sb, businessId) {
  const { data, error } = await sb
    .from("invoice_templates")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return null;
  return (data && data[0]) || null;
}

export async function GET(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId is required" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: booking, error } = await sb
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("business_id", auth.business.id)
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!booking) return NextResponse.json({ detail: "Booking not found" }, { status: 404 });

  const template = await getActiveInvoiceTemplateSupabase(sb, auth.business.id);
  const base64 = await generateInvoicePdfBase64({ booking, business: auth.business, template });
  const bytes = Buffer.from(base64, "base64");

  const filename = `${booking?.invoice_id || "invoice"}.pdf`;
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^a-z0-9._-]+/gi, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}


import { NextResponse } from "next/server";
import { requireSession } from "../../../_utils/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateInvoicePdfBase64 } from "@/lib/invoicePdf";
import { sendEmailViaResend } from "@/lib/email";

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

function safeEmail(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
  return s;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request, { params }) {
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

  const customerEmail = safeEmail(booking?.customer_email);
  if (!customerEmail) {
    return NextResponse.json({ detail: "Booking has no valid customer_email" }, { status: 400 });
  }

  const template = await getActiveInvoiceTemplateSupabase(sb, auth.business.id);
  const pdfBase64 = await generateInvoicePdfBase64({ booking, business: auth.business, template });
  const filename = `${booking?.invoice_id || "invoice"}.pdf`;

  const businessName = String(auth.business?.business_name || auth.business?.email || "DoBook").trim() || "DoBook";
  const subject = `Invoice from ${businessName}`;
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#18181b;">
      <p style="font-size:14px;">Hi ${escapeHtml(booking?.customer_name || "there")},</p>
      <p style="font-size:14px;">Attached is your invoice${booking?.invoice_id ? ` (${escapeHtml(booking.invoice_id)})` : ""}.</p>
      <p style="font-size:14px;">Thank you,<br/>${escapeHtml(businessName)}</p>
    </div>
  `;
  const text =
    `Hi ${booking?.customer_name || "there"},\n\n` +
    `Attached is your invoice${booking?.invoice_id ? ` (${booking.invoice_id})` : ""}.\n\n` +
    `Thank you,\n${businessName}\n`;

  const result = await sendEmailViaResend({
    to: customerEmail,
    subject,
    html,
    text,
    attachments: [
      {
        filename,
        contentType: "application/pdf",
        content: pdfBase64,
      },
    ],
    replyTo: safeEmail(auth.business?.email) || undefined,
  });

  if (!result?.ok) {
    return NextResponse.json({ detail: result?.error || "Failed to send invoice" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

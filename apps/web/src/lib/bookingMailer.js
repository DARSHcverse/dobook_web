import { sendEmailViaResend } from "./email";
import { generateInvoicePdfBase64 } from "./invoicePdf";

function safeEmail(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return s;
}

function bookingSummaryLines({ booking }) {
  const lines = [];
  if (booking?.booking_date) lines.push(`Date: ${booking.booking_date}`);
  if (booking?.booking_time) lines.push(`Start: ${booking.booking_time}`);
  if (booking?.end_time) lines.push(`End: ${booking.end_time}`);
  if (booking?.event_location) lines.push(`Address: ${booking.event_location}`);
  if (booking?.booth_type) lines.push(`Booth: ${booking.booth_type}`);
  if (booking?.price !== undefined) lines.push(`Price: $${Number(booking.price || 0).toFixed(2)}`);
  return lines;
}

export async function sendBookingCreatedEmails({ booking, business }) {
  const customerEmail = safeEmail(booking?.customer_email);
  const businessEmail = safeEmail(business?.email);

  const attachments = [];
  try {
    const pdfBase64 = generateInvoicePdfBase64({ booking, business });
    attachments.push({
      filename: `${booking?.invoice_id || "invoice"}.pdf`,
      contentType: "application/pdf",
      content: pdfBase64,
    });
  } catch {
    // best-effort: still send emails without attachment
  }

  const subject = `Booking confirmed${booking?.invoice_id ? ` • Invoice ${booking.invoice_id}` : ""}`;
  const lines = bookingSummaryLines({ booking });
  const summaryHtml = lines.map((l) => `<li>${l}</li>`).join("");
  const summaryText = lines.join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin:0 0 12px;">Booking Confirmed</h2>
      <p style="margin:0 0 12px;">Thanks ${String(booking?.customer_name || "").trim() || "there"} — your booking is confirmed.</p>
      <ul style="margin:0 0 16px; padding-left:18px;">${summaryHtml}</ul>
      <p style="margin:0; color:#666; font-size:12px;">Invoice PDF attached.</p>
    </div>
  `;

  const text = `Booking Confirmed\n\n${summaryText}\n\nInvoice PDF attached.`;

  const results = { customer: null, business: null };

  if (customerEmail) {
    results.customer = await sendEmailViaResend({
      to: customerEmail,
      subject,
      html,
      text,
      attachments,
      replyTo: businessEmail || undefined,
    });
  }

  if (businessEmail) {
    results.business = await sendEmailViaResend({
      to: businessEmail,
      subject: `New booking • ${String(booking?.customer_name || "").trim() || "Customer"}`,
      html,
      text,
      attachments,
    });
  }

  return results;
}

export async function sendBookingReminderEmail({ booking, business, daysBefore }) {
  const customerEmail = safeEmail(booking?.customer_email);
  if (!customerEmail) return { ok: false, skipped: true, error: "No customer email" };

  const subject = `Reminder: your event is in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`;
  const lines = bookingSummaryLines({ booking });
  const summaryHtml = lines.map((l) => `<li>${l}</li>`).join("");
  const summaryText = lines.join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin:0 0 12px;">Event Reminder</h2>
      <p style="margin:0 0 12px;">Just a reminder your event is coming up in ${daysBefore} day${daysBefore === 1 ? "" : "s"}.</p>
      <ul style="margin:0; padding-left:18px;">${summaryHtml}</ul>
    </div>
  `;
  const text = `Event Reminder\n\nYour event is in ${daysBefore} day${daysBefore === 1 ? "" : "s"}.\n\n${summaryText}`;

  return sendEmailViaResend({ to: customerEmail, subject, html, text, replyTo: safeEmail(business?.email) || undefined });
}


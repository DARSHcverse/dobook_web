import { sendEmailViaResend } from "./email";
import { generateInvoicePdfBase64 } from "./invoicePdf";

function safeEmail(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return s;
}

function safeName(value) {
  return String(value || "").trim();
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

export async function sendBusinessWelcomeEmail({ business }) {
  const businessEmail = safeEmail(business?.email);
  if (!businessEmail) return { ok: false, skipped: true, error: "No business email" };

  const businessName = safeName(business?.business_name) || "your business";
  const subject = "Thanks for choosing DoBook";

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin:0 0 12px;">Thanks for choosing DoBook</h2>
      <p style="margin:0 0 12px;">Welcome, <strong>${businessName}</strong>.</p>
      <p style="margin:0 0 12px;">You’re all set up. When a client books you, they’ll receive a confirmation email with an invoice PDF, and you’ll get a notification email too.</p>
      <p style="margin:0; color:#666; font-size:12px;">Tip: If you enabled reminders, clients will also get emails 5 days and 1 day before the event.</p>
    </div>
  `;

  const text =
    `Thanks for choosing DoBook\n\n` +
    `Welcome, ${businessName}.\n\n` +
    `When a client books you, they’ll receive a confirmation email with an invoice PDF, and you’ll get a notification email too.\n`;

  return sendEmailViaResend({ to: businessEmail, subject, html, text });
}

export async function sendBookingCreatedEmails({ booking, business }) {
  const customerEmail = safeEmail(booking?.customer_email);
  const businessEmail = safeEmail(business?.email);
  const businessName = safeName(business?.business_name) || "this business";
  const customerName = safeName(booking?.customer_name) || "there";

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

  const subject = `Thanks for booking${booking?.invoice_id ? ` • Invoice ${booking.invoice_id}` : ""}`;
  const lines = bookingSummaryLines({ booking });
  const summaryHtml = lines.map((l) => `<li>${l}</li>`).join("");
  const summaryText = lines.join("\n");

  const customerHtml = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin:0 0 12px;">Thanks for booking ${businessName}</h2>
      <p style="margin:0 0 12px;">Hi ${customerName} — your booking is confirmed.</p>
      <ul style="margin:0 0 16px; padding-left:18px;">${summaryHtml}</ul>
      <p style="margin:0; color:#666; font-size:12px;">Invoice PDF attached.</p>
    </div>
  `;

  const customerText = `Thanks for booking ${businessName}\n\n${summaryText}\n\nInvoice PDF attached.`;

  const businessHtml = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin:0 0 12px;">New booking</h2>
      <p style="margin:0 0 12px;"><strong>${customerName}</strong> booked you.</p>
      <ul style="margin:0 0 16px; padding-left:18px;">${summaryHtml}</ul>
      <p style="margin:0; color:#666; font-size:12px;">Invoice PDF attached.</p>
    </div>
  `;
  const businessText = `New booking\n\n${customerName} booked you.\n\n${summaryText}\n\nInvoice PDF attached.`;

  const results = { customer: null, business: null };

  if (customerEmail) {
    results.customer = await sendEmailViaResend({
      to: customerEmail,
      subject,
      html: customerHtml,
      text: customerText,
      attachments,
      replyTo: businessEmail || undefined,
    });
  }

  if (businessEmail) {
    results.business = await sendEmailViaResend({
      to: businessEmail,
      subject: `New booking • ${String(booking?.customer_name || "").trim() || "Customer"}`,
      html: businessHtml,
      text: businessText,
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

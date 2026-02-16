import { sendEmailViaResend } from "./email";
import { generateInvoicePdfBase64 } from "./invoicePdf";
import { hasProAccess } from "./entitlements";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://www.do-book.com";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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
  if (booking?.booth_type) lines.push(`Booth/Service: ${booking.booth_type}`);
  else if (booking?.service_type) lines.push(`Booth/Service: ${booking.service_type}`);
  if (booking?.price !== undefined) lines.push(`Price: $${Number(booking.price || 0).toFixed(2)}`);
  return lines;
}

function bookingSummaryTableHtml({ booking }) {
  const rows = [];
  if (booking?.booking_date) rows.push(["Date", booking.booking_date]);
  if (booking?.booking_time) rows.push(["Start", booking.booking_time]);
  if (booking?.end_time) rows.push(["End", booking.end_time]);
  if (booking?.event_location) rows.push(["Address", booking.event_location]);
  if (booking?.booth_type || booking?.service_type) rows.push(["Service", booking.booth_type || booking.service_type]);
  if (booking?.price !== undefined) rows.push(["Price", `$${Number(booking.price || 0).toFixed(2)}`]);

  const tr = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:10px 12px; border-top:1px solid #e4e4e7; color:#52525b; font-size:13px; width:160px;">
            ${escapeHtml(k)}
          </td>
          <td style="padding:10px 12px; border-top:1px solid #e4e4e7; color:#18181b; font-size:13px; font-weight:600;">
            ${escapeHtml(v)}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4e4e7; border-radius:12px; overflow:hidden; background:#fff;">
      <tbody>
        ${tr}
      </tbody>
    </table>
  `;
}

function emailLayout({ title, preheader, contentHtml, logoUrl, logoAlt }) {
  const brand = "#e11d48";
  const bg = "#f4f4f5";
  const site = resolveSiteUrl();
  const defaultLogo = `${site}/brand/dobook-logo.png`;

  const resolveLogo = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return defaultLogo;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return `${site}${s}`;
    return `${site}/${s}`;
  };

  const logo = resolveLogo(logoUrl);
  const alt = String(logoAlt || "DoBook").trim() || "DoBook";

  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0; padding:0; background:${bg};">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
          ${escapeHtml(preheader || "")}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg}; padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
                <tr>
                  <td style="padding:12px 4px 18px;">
                    <a href="${site}" style="text-decoration:none;">
                      <img src="${escapeHtml(logo)}" width="140" alt="${escapeHtml(alt)}" style="display:block; height:auto;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff; border:1px solid #e4e4e7; border-radius:16px; padding:22px;">
                    <h1 style="margin:0 0 14px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:20px; line-height:1.25; color:#18181b;">
                      ${escapeHtml(title)}
                    </h1>
                    ${contentHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 6px 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; line-height:1.5; color:#71717a;">
                    <div style="border-top:1px solid #e4e4e7; padding-top:12px;">
                      <div style="margin-bottom:6px;">Sent by DoBook • <a href="${site}" style="color:${brand}; text-decoration:none;">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a></div>
                      <div>Need help? Reply to this email.</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function paragraphHtml(text) {
  return `<p style="margin:0 0 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; line-height:1.6; color:#3f3f46;">${text}</p>`;
}

export async function sendBusinessWelcomeEmail({ business }) {
  const businessEmail = safeEmail(business?.email);
  if (!businessEmail) return { ok: false, skipped: true, error: "No business email" };

  const businessName = safeName(business?.business_name) || "your business";
  const subject = "Thanks for choosing DoBook";

  const html = emailLayout({
    title: "Welcome to DoBook",
    preheader: "Your account is ready. Start accepting bookings in minutes.",
    contentHtml: `
      ${paragraphHtml(`Welcome, <strong style="color:#18181b;">${escapeHtml(businessName)}</strong>.`)}
      ${paragraphHtml("You’re all set up. When a client books you, they’ll receive a booking confirmation email, and you’ll get a notification email too.")}
      <div style="padding:12px 14px; border:1px solid #e4e4e7; border-radius:12px; background:#fafafa; margin-top:12px;">
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#52525b;">
          Tip: Pro includes invoice PDFs and automated reminders.
        </div>
      </div>
    `,
  });

  const text =
    `Thanks for choosing DoBook\n\n` +
    `Welcome, ${businessName}.\n\n` +
    `When a client books you, they’ll receive a booking confirmation email, and you’ll get a notification email too.\n`;

  return sendEmailViaResend({ to: businessEmail, subject, html, text });
}

export async function sendBookingCreatedEmails({ booking, business }) {
  const customerEmail = safeEmail(booking?.customer_email);
  const businessEmail = safeEmail(business?.email);
  const businessName = safeName(business?.business_name) || "this business";
  const customerName = safeName(booking?.customer_name) || "there";
  const includeInvoicePdf = hasProAccess(business);
  const logoUrl = business?.logo_url || "";

  const attachments = [];
  if (includeInvoicePdf) {
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
  }

  const subject = includeInvoicePdf
    ? `Thanks for booking${booking?.invoice_id ? ` • Invoice ${booking.invoice_id}` : ""}`
    : `Thanks for booking ${businessName}`;
  const lines = bookingSummaryLines({ booking });
  const summaryText = lines.join("\n");

  const invoiceNoteText = includeInvoicePdf
    ? "Invoice PDF attached."
    : "Booking confirmation only (no invoice PDF on the Free plan).";

  const customerHtml = emailLayout({
    title: `Booking confirmed`,
    preheader: `Your booking with ${businessName} is confirmed.`,
    logoUrl,
    logoAlt: businessName,
    contentHtml: `
      ${paragraphHtml(`Hi <strong style="color:#18181b;">${escapeHtml(customerName)}</strong> — your booking with <strong style="color:#18181b;">${escapeHtml(businessName)}</strong> is confirmed.`)}
      ${bookingSummaryTableHtml({ booking })}
      <div style="margin-top:12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#71717a;">
        ${includeInvoicePdf ? "Invoice PDF attached." : "Booking confirmation only (no invoice PDF on the Free plan)."}
      </div>
    `,
  });

  const customerText = `Thanks for booking ${businessName}\n\n${summaryText}\n\n${invoiceNoteText}`;

  const businessHtml = emailLayout({
    title: "New booking",
    preheader: `${customerName} booked you.`,
    logoUrl,
    logoAlt: businessName,
    contentHtml: `
      ${paragraphHtml(`<strong style="color:#18181b;">${escapeHtml(customerName)}</strong> booked you.`)}
      ${bookingSummaryTableHtml({ booking })}
      <div style="margin-top:12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#71717a;">
        ${includeInvoicePdf ? "Invoice PDF attached." : "No invoice PDF for Free plan bookings."}
      </div>
    `,
  });
  const businessText = `New booking\n\n${customerName} booked you.\n\n${summaryText}\n\n${invoiceNoteText}`;

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
  const businessName = safeName(business?.business_name) || "this business";
  const logoUrl = business?.logo_url || "";

  const subject = `Reminder: your event is in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`;
  const lines = bookingSummaryLines({ booking });
  const summaryText = lines.join("\n");

  const html = emailLayout({
    title: "Event reminder",
    preheader: `Your event is in ${daysBefore} day${daysBefore === 1 ? "" : "s"}.`,
    logoUrl,
    logoAlt: businessName,
    contentHtml: `
      ${paragraphHtml(`Just a reminder your event is coming up in <strong style="color:#18181b;">${daysBefore}</strong> day${daysBefore === 1 ? "" : "s"}.`)}
      ${bookingSummaryTableHtml({ booking })}
    `,
  });
  const text = `Event Reminder\n\nYour event is in ${daysBefore} day${daysBefore === 1 ? "" : "s"}.\n\n${summaryText}`;

  return sendEmailViaResend({ to: customerEmail, subject, html, text, replyTo: safeEmail(business?.email) || undefined });
}

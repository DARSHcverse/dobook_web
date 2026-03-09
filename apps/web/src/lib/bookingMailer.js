import { sendEmailViaResend } from "./email";
import { generateInvoicePdfBase64 } from "./invoicePdf";
import { hasProAccess } from "./entitlements";
import {
  bookingSummaryLines,
  bookingSummaryTableHtml,
  emailLayout,
  escapeHtml,
  paragraphHtml,
  parseBookingDateUtc,
  reminderAtUtc,
  resolveSiteUrl,
  resolveSignupNotifyRecipients,
  safeEmail,
  safeName,
} from "./email/templates";
import { BUSINESS_TYPES, getBusinessTypeTemplate, normalizeBusinessType } from "./businessTypeTemplates";

function resolveBusinessTypeLabel(value) {
  const id = normalizeBusinessType(value);
  if (!id) return "";
  return BUSINESS_TYPES.find((t) => t.id === id)?.label || "";
}

export async function sendOwnerNewSignupEmail({ business, requestedPlan }) {
  const to = resolveSignupNotifyRecipients();
  if (!to.length) return { ok: false, skipped: true, error: "No signup notification recipients configured" };

  const businessName = safeName(business?.business_name) || "Unknown business";
  const businessEmail = safeEmail(business?.email) || "-";
  const businessPhone = safeName(business?.phone) || "-";
  const industry = safeName(business?.industry) || "-";
  const businessType = resolveBusinessTypeLabel(business?.business_type) || "-";
  const plan = safeName(requestedPlan || business?.subscription_plan) || "-";
  const createdAt = safeName(business?.created_at) || "-";
  const businessId = safeName(business?.id) || "-";

  const subject = `New DoBook signup: ${businessName}`;

  const html = emailLayout({
    title: "New signup",
    preheader: `${businessName} just created an account.`,
    contentHtml: `
      ${paragraphHtml(`<strong style="color:#18181b;">${escapeHtml(businessName)}</strong> just signed up.`)}
      <div style="padding:12px 14px; border:1px solid #e4e4e7; border-radius:12px; background:#fafafa; margin-top:12px;">
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#18181b; font-weight:600; margin-bottom:8px;">
          Details
        </div>
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#52525b; line-height:1.6;">
          <div><strong style="color:#18181b;">Business ID:</strong> ${escapeHtml(businessId)}</div>
          <div><strong style="color:#18181b;">Email:</strong> ${escapeHtml(businessEmail)}</div>
          <div><strong style="color:#18181b;">Phone:</strong> ${escapeHtml(businessPhone)}</div>
          <div><strong style="color:#18181b;">Industry:</strong> ${escapeHtml(industry)}</div>
          <div><strong style="color:#18181b;">Business type:</strong> ${escapeHtml(businessType)}</div>
          <div><strong style="color:#18181b;">Requested plan:</strong> ${escapeHtml(plan)}</div>
          <div><strong style="color:#18181b;">Created at:</strong> ${escapeHtml(createdAt)}</div>
        </div>
      </div>
    `,
  });

  const text =
    `New signup\n\n` +
    `Business: ${businessName}\n` +
    `Business ID: ${businessId}\n` +
    `Email: ${businessEmail}\n` +
    `Phone: ${businessPhone}\n` +
    `Industry: ${industry}\n` +
    `Business type: ${businessType}\n` +
    `Requested plan: ${plan}\n` +
    `Created at: ${createdAt}\n`;

  return sendEmailViaResend({ to, subject, html, text, replyTo: businessEmail !== "-" ? businessEmail : undefined });
}

export async function sendBusinessWelcomeEmail({ business }) {
  const businessEmail = safeEmail(business?.email);
  if (!businessEmail) return { ok: false, skipped: true, error: "No business email" };

  const businessName = safeName(business?.business_name) || "your business";
  const businessTypeLabel = resolveBusinessTypeLabel(business?.business_type);
  const template = getBusinessTypeTemplate(business?.business_type);
  const site = resolveSiteUrl();
  const subject = "Thanks for choosing DoBook";

  const servicesCount = Array.isArray(template?.services) ? template.services.length : 0;
  const fieldsCount = Array.isArray(template?.booking_fields) ? template.booking_fields.length : 0;
  const addonsCount = Array.isArray(template?.addons) ? template.addons.length : 0;

  const summaryHtml = template
    ? `
      <div style="padding:12px 14px; border:1px solid #e4e4e7; border-radius:12px; background:#fafafa; margin-top:12px;">
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#18181b; font-weight:600; margin-bottom:8px;">
          Pre-filled for you${businessTypeLabel ? ` (${escapeHtml(businessTypeLabel)})` : ""}
        </div>
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#52525b; line-height:1.6;">
          <div><strong style="color:#18181b;">Service categories:</strong> ${servicesCount}</div>
          <div><strong style="color:#18181b;">Booking fields:</strong> ${fieldsCount}</div>
          <div><strong style="color:#18181b;">Add-ons:</strong> ${addonsCount}</div>
        </div>
      </div>
    `
    : "";

  const html = emailLayout({
    title: "Welcome to DoBook",
    preheader: "Your account is ready. Start accepting bookings in minutes.",
    contentHtml: `
      ${paragraphHtml(`Welcome, <strong style="color:#18181b;">${escapeHtml(businessName)}</strong>.`)}
      ${paragraphHtml("You’re all set up. When a client books you, they’ll receive a booking confirmation email, and you’ll get a notification email too.")}
      ${summaryHtml}
      <div style="margin-top:14px;">
        <a href="${escapeHtml(`${site}/dashboard`)}" style="display:inline-block; background:#e11d48; color:#ffffff; padding:10px 14px; border-radius:999px; text-decoration:none; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; font-weight:700;">
          Go to dashboard
        </a>
      </div>
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
    `When a client books you, they’ll receive a booking confirmation email, and you’ll get a notification email too.\n` +
    (template
      ? `\nPre-filled for you${businessTypeLabel ? ` (${businessTypeLabel})` : ""}:\n- Service categories: ${servicesCount}\n- Booking fields: ${fieldsCount}\n- Add-ons: ${addonsCount}\n`
      : "") +
    `\nDashboard: ${site}/dashboard\n`;

  return sendEmailViaResend({ to: businessEmail, subject, html, text });
}

export async function sendBookingCreatedEmails({ booking, business, template }) {
  const customerEmail = safeEmail(booking?.customer_email);
  const businessEmail = safeEmail(business?.email);
  const businessName = safeName(business?.business_name) || "this business";
  const customerName = safeName(booking?.customer_name) || "there";
  const includeInvoicePdf = hasProAccess(business);
  const logoUrl = { url: business?.logo_url || "", businessId: business?.id || "" };

  const attachments = [];
  if (includeInvoicePdf) {
    try {
      const pdfBase64 = await generateInvoicePdfBase64({ booking, business, template });
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

  const businessTypeId = normalizeBusinessType(business?.business_type);
  const includeMeetingLinkPlaceholder = businessTypeId === "consultant";
  const meetingLinkHtml = includeMeetingLinkPlaceholder
    ? `
      <div style="padding:12px 14px; border:1px dashed #e4e4e7; border-radius:12px; background:#fafafa; margin-top:12px;">
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#18181b; font-weight:700; margin-bottom:6px;">
          Meeting link
        </div>
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#52525b; line-height:1.6;">
          A Zoom/Google Meet link will be provided before the session.
        </div>
      </div>
    `
    : "";
  const meetingLinkText = includeMeetingLinkPlaceholder ? "\nMeeting link: Zoom/Meet link will be provided before the session.\n" : "";

  const customerHtml = emailLayout({
    title: `Booking confirmed`,
    preheader: `Your booking with ${businessName} is confirmed.`,
    logoUrl,
    logoAlt: businessName,
    contentHtml: `
      ${paragraphHtml(`Hi <strong style="color:#18181b;">${escapeHtml(customerName)}</strong> — your booking with <strong style="color:#18181b;">${escapeHtml(businessName)}</strong> is confirmed.`)}
      ${bookingSummaryTableHtml({ booking })}
      ${meetingLinkHtml}
      <div style="margin-top:12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#71717a;">
        ${includeInvoicePdf ? "Invoice PDF attached." : "Booking confirmation only (no invoice PDF on the Free plan)."}
      </div>
    `,
  });

  const customerText = `Thanks for booking ${businessName}\n\n${summaryText}\n${meetingLinkText}\n${invoiceNoteText}`;

  const businessHtml = emailLayout({
    title: "New booking",
    preheader: `${customerName} booked you.`,
    logoUrl,
    logoAlt: businessName,
    contentHtml: `
      ${paragraphHtml(`<strong style="color:#18181b;">${escapeHtml(customerName)}</strong> booked you.`)}
      ${bookingSummaryTableHtml({ booking })}
      ${meetingLinkHtml}
      <div style="margin-top:12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#71717a;">
        ${includeInvoicePdf ? "Invoice PDF attached." : "No invoice PDF for Free plan bookings."}
      </div>
    `,
  });
  const businessText = `New booking\n\n${customerName} booked you.\n\n${summaryText}\n${meetingLinkText}\n${invoiceNoteText}`;

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

export async function scheduleBookingRemindersViaResend({ booking, business }) {
  if (!hasProAccess(business)) return { ok: false, skipped: true, error: "No Pro access" };

  const scheduleViaResend = String(process.env.REMINDERS_SCHEDULE_VIA_RESEND || "").trim().toLowerCase();
  const shouldSchedule =
    scheduleViaResend === "1" ||
    scheduleViaResend === "true" ||
    scheduleViaResend === "yes" ||
    !process.env.CRON_SECRET;

  if (!shouldSchedule) return { ok: false, skipped: true, error: "Scheduling disabled" };

  const eventAt = parseBookingDateUtc(booking?.booking_date);
  if (!eventAt) return { ok: false, skipped: true, error: "No booking_date" };

  const now = new Date();
  const schedule = [5, 1];
  const scheduled = { reminder_5d_scheduled_at: null, reminder_1d_scheduled_at: null };
  for (const daysBefore of schedule) {
    const when = reminderAtUtc(eventAt, daysBefore);
    // Only schedule future reminders.
    if (!(when instanceof Date) || Number.isNaN(when.getTime())) continue;
    if (when.getTime() <= now.getTime() + 5 * 60 * 1000) continue;
    // eslint-disable-next-line no-await-in-loop
    const res = await sendBookingReminderEmail({
      booking,
      business,
      daysBefore,
      scheduledAt: when.toISOString(),
    });
    if (res?.ok) {
      if (daysBefore === 5) scheduled.reminder_5d_scheduled_at = when.toISOString();
      if (daysBefore === 1) scheduled.reminder_1d_scheduled_at = when.toISOString();
    }
  }

  return { ok: true, scheduled };
}

export async function sendBookingReminderEmail({ booking, business, daysBefore, scheduledAt }) {
  const customerEmail = safeEmail(booking?.customer_email);
  if (!customerEmail) return { ok: false, skipped: true, error: "No customer email" };
  if (String(booking?.status || "confirmed").trim().toLowerCase() === "cancelled") {
    return { ok: false, skipped: true, error: "Booking cancelled" };
  }

  const subject = `Reminder: your event is in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`;
  const lines = bookingSummaryLines({ booking });
  const summaryText = lines.join("\n");

  const html = emailLayout({
    title: "Event reminder",
    preheader: `Your event is in ${daysBefore} day${daysBefore === 1 ? "" : "s"}.`,
    logoUrl: { url: business?.logo_url || "", businessId: business?.id || "" },
    logoAlt: safeName(business?.business_name) || "DoBook",
    contentHtml: `
      ${paragraphHtml(`Just a reminder your event is coming up in <strong style="color:#18181b;">${daysBefore}</strong> day${daysBefore === 1 ? "" : "s"}.`)}
      ${bookingSummaryTableHtml({ booking })}
    `,
  });
  const text = `Event Reminder\n\nYour event is in ${daysBefore} day${daysBefore === 1 ? "" : "s"}.\n\n${summaryText}`;

  return sendEmailViaResend({
    to: customerEmail,
    subject,
    html,
    text,
    scheduledAt,
    replyTo: safeEmail(business?.email) || undefined,
  });
}

export async function sendBookingCancelledEmail({ booking, business }) {
  const customerEmail = safeEmail(booking?.customer_email);
  if (!customerEmail) return { ok: false, skipped: true, error: "No customer email" };

  const businessName = safeName(business?.business_name) || "this business";
  const customerName = safeName(booking?.customer_name) || "there";
  const businessEmail = safeEmail(business?.email);

  const subject = `Booking cancelled • ${businessName}`;
  const lines = bookingSummaryLines({ booking });
  const summaryText = lines.join("\n");

  const html = emailLayout({
    title: "Booking cancelled",
    preheader: `Your booking with ${businessName} has been cancelled.`,
    logoUrl: { url: business?.logo_url || "", businessId: business?.id || "" },
    logoAlt: businessName,
    contentHtml: `
      ${paragraphHtml(
      `Hi <strong style="color:#18181b;">${escapeHtml(customerName)}</strong> — your booking with <strong style="color:#18181b;">${escapeHtml(
        businessName,
      )}</strong> has been cancelled.`,
    )}
      ${bookingSummaryTableHtml({ booking })}
      <div style="margin-top:12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#71717a;">
        If you have questions or want to reschedule, please reply to this email.
      </div>
    `,
  });

  const text =
    `Booking cancelled\n\n` +
    `Hi ${customerName} — your booking with ${businessName} has been cancelled.\n\n` +
    `${summaryText}\n\n` +
    `If you have questions or want to reschedule, reply to this email.\n`;

  return sendEmailViaResend({
    to: customerEmail,
    subject,
    html,
    text,
    replyTo: businessEmail || undefined,
  });
}

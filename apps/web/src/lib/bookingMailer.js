import { sendEmailViaResend } from "./email";
import { generateInvoicePdfBase64 } from "./invoicePdf";
import { hasProAccess, isOwnerBusiness } from "./entitlements";
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

function formatCustomFieldValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const urls = value.map((x) => String(x || "").trim()).filter(Boolean);
    if (!urls.length) return "";
    return `${urls.length} file(s) uploaded`;
  }
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

function titleCaseKey(key) {
  return String(key || "")
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function customFieldsTableHtml({ booking, fieldDefs }) {
  const defs = Array.isArray(fieldDefs) ? fieldDefs : [];
  const byKey = new Map(defs.map((d) => [String(d?.field_key || "").trim(), d]));
  const custom = booking?.custom_fields && typeof booking.custom_fields === "object" ? booking.custom_fields : {};

  const rows = [];
  for (const [key, raw] of Object.entries(custom || {})) {
    const k = String(key || "").trim();
    if (!k) continue;
    const def = byKey.get(k);
    if (def?.is_private) continue;
    const value = formatCustomFieldValue(raw);
    if (!value) continue;
    rows.push([def?.field_name ? String(def.field_name) : titleCaseKey(k), value]);
  }

  if (!rows.length) return "";

  const tr = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:10px 12px; border-top:1px solid #e4e4e7; color:#52525b; font-size:13px; width:200px;">
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
    <div style="margin-top:12px;">
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#18181b; font-weight:700; margin-bottom:8px;">
        Booking details
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4e4e7; border-radius:12px; overflow:hidden; background:#fff;">
        <tbody>
          ${tr}
        </tbody>
      </table>
    </div>
  `;
}

function customFieldsText({ booking, fieldDefs }) {
  const defs = Array.isArray(fieldDefs) ? fieldDefs : [];
  const byKey = new Map(defs.map((d) => [String(d?.field_key || "").trim(), d]));
  const custom = booking?.custom_fields && typeof booking.custom_fields === "object" ? booking.custom_fields : {};
  const lines = [];
  for (const [key, raw] of Object.entries(custom || {})) {
    const k = String(key || "").trim();
    if (!k) continue;
    const def = byKey.get(k);
    if (def?.is_private) continue;
    const value = formatCustomFieldValue(raw);
    if (!value) continue;
    lines.push(`${def?.field_name ? String(def.field_name) : titleCaseKey(k)}: ${value}`);
  }
  if (!lines.length) return "";
  return `\nBooking details:\n${lines.map((l) => `- ${l}`).join("\n")}\n`;
}

export async function sendBookingCreatedEmails({ booking, business, template, fieldDefs }) {
  const customerEmail = safeEmail(booking?.customer_email);
  const businessEmail = safeEmail(business?.email);
  const businessName = safeName(business?.business_name) || "this business";
  const customerName = safeName(booking?.customer_name) || "there";
  const includeInvoicePdf = hasProAccess(business);
  const confirmationEnabled = business?.confirmation_email_enabled !== false;
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
      ${customFieldsTableHtml({ booking, fieldDefs })}
      ${meetingLinkHtml}
      <div style="margin-top:12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#71717a;">
        ${includeInvoicePdf ? "Invoice PDF attached." : "Booking confirmation only (no invoice PDF on the Free plan)."}
      </div>
    `,
  });

  const customerText =
    `Thanks for booking ${businessName}\n\n${summaryText}\n` +
    customFieldsText({ booking, fieldDefs }) +
    `${meetingLinkText}\n${invoiceNoteText}`;

  const businessHtml = emailLayout({
    title: "New booking",
    preheader: `${customerName} booked you.`,
    logoUrl,
    logoAlt: businessName,
    contentHtml: `
      ${paragraphHtml(`<strong style="color:#18181b;">${escapeHtml(customerName)}</strong> booked you.`)}
      ${bookingSummaryTableHtml({ booking })}
      ${customFieldsTableHtml({ booking, fieldDefs })}
      ${meetingLinkHtml}
      <div style="margin-top:12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#71717a;">
        ${includeInvoicePdf ? "Invoice PDF attached." : "No invoice PDF for Free plan bookings."}
      </div>
    `,
  });
  const businessText =
    `New booking\n\n${customerName} booked you.\n\n${summaryText}\n` +
    customFieldsText({ booking, fieldDefs }) +
    `${meetingLinkText}\n${invoiceNoteText}`;

  const results = { customer: null, business: null };

  if (customerEmail && confirmationEnabled) {
    results.customer = await sendEmailViaResend({
      to: customerEmail,
      subject,
      html: customerHtml,
      text: customerText,
      attachments,
      replyTo: businessEmail || undefined,
    });
  } else if (customerEmail && !confirmationEnabled) {
    results.customer = { ok: false, skipped: true, error: "Confirmation email disabled" };
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
  const subStatus = String(business?.subscription_status || "").trim().toLowerCase();
  const proActive = hasProAccess(business) && (isOwnerBusiness(business) || subStatus === "active");
  if (!proActive) return { ok: false, skipped: true, error: "No Pro access" };
  if (business?.reminders_enabled === false) return { ok: false, skipped: true, error: "Reminders disabled" };

  const scheduleViaResend = String(process.env.REMINDERS_SCHEDULE_VIA_RESEND || "").trim().toLowerCase();
  const shouldSchedule =
    scheduleViaResend === "1" ||
    scheduleViaResend === "true" ||
    scheduleViaResend === "yes" ||
    !process.env.CRON_SECRET;

  if (!shouldSchedule) return { ok: false, skipped: true, error: "Scheduling disabled" };

  const eventAt = parseBookingDateTimeUtc(booking);
  if (!eventAt) return { ok: false, skipped: true, error: "No booking_date" };

  const reminderTimes = normalizeReminderTimes(
    Array.isArray(business?.reminder_times) && business.reminder_times.length
      ? business.reminder_times
      : business?.reminder_timing_hrs,
  );
  if (!reminderTimes.length) return { ok: false, skipped: true, error: "No reminder times" };

  const includeDetails = business?.reminder_include_booking_details !== false;
  const includePaymentLink = Boolean(business?.reminder_include_payment_link) && Boolean(String(business?.payment_link || "").trim());
  const customMessage = String(business?.reminder_custom_message || "").trim();

  const now = new Date();
  const scheduledHours = [];
  for (const hoursBefore of reminderTimes) {
    const when = reminderAtUtcHours(eventAt, hoursBefore);
    // Only schedule future reminders.
    if (!(when instanceof Date) || Number.isNaN(when.getTime())) continue;
    if (when.getTime() <= now.getTime() + 5 * 60 * 1000) continue;
    // eslint-disable-next-line no-await-in-loop
    const res = await sendBookingReminderEmail({
      booking,
      business,
      hoursBefore,
      scheduledAt: when.toISOString(),
      includeDetails,
      includePaymentLink,
      customMessage,
    });
    if (res?.ok) scheduledHours.push(hoursBefore);
  }

  return { ok: true, scheduled_hours: scheduledHours };
}

function parseBookingDateTimeUtc(booking) {
  const dateStr = String(booking?.booking_date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map((n) => Number(n));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

  const timeStr = String(booking?.booking_time || "").trim();
  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, min] = timeStr.split(":").map((n) => Number(n));
    if (Number.isFinite(h) && Number.isFinite(min)) {
      return new Date(Date.UTC(y, m - 1, d, h, min, 0, 0));
    }
  }

  return parseBookingDateUtc(dateStr);
}

function reminderAtUtcHours(eventAtUtc, hoursBefore) {
  const d = new Date(eventAtUtc);
  d.setTime(d.getTime() - Number(hoursBefore || 0) * 60 * 60 * 1000);
  return d;
}

function normalizeReminderTimes(value) {
  const allowed = new Set([1, 2, 4, 12, 24, 48, 72, 168]);
  const list = Array.isArray(value) ? value : [];
  const cleaned = list
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && allowed.has(v));
  return Array.from(new Set(cleaned)).slice(0, 3);
}

function formatReminderLabel(hoursBefore) {
  const h = Number(hoursBefore || 0);
  if (!Number.isFinite(h) || h <= 0) return { label: "soon", value: 0, unit: "hour" };
  if (h % 168 === 0) {
    const weeks = h / 168;
    return { label: `${weeks} week${weeks === 1 ? "" : "s"}`, value: weeks, unit: "week" };
  }
  if (h % 24 === 0) {
    const days = h / 24;
    return { label: `${days} day${days === 1 ? "" : "s"}`, value: days, unit: "day" };
  }
  return { label: `${h} hour${h === 1 ? "" : "s"}`, value: h, unit: "hour" };
}

export async function sendBookingReminderEmail({
  booking,
  business,
  hoursBefore,
  daysBefore,
  scheduledAt,
  includeDetails = true,
  includePaymentLink = false,
  customMessage = "",
}) {
  const customerEmail = safeEmail(booking?.customer_email);
  if (!customerEmail) return { ok: false, skipped: true, error: "No customer email" };
  if (String(booking?.status || "confirmed").trim().toLowerCase() === "cancelled") {
    return { ok: false, skipped: true, error: "Booking cancelled" };
  }

  const resolvedHours = Number.isFinite(Number(hoursBefore)) ? Number(hoursBefore) : Number(daysBefore || 0) * 24;
  const label = formatReminderLabel(resolvedHours);
  const subject = `Reminder: your event is in ${label.label}`;
  const lines = includeDetails ? bookingSummaryLines({ booking }) : [];
  const summaryText = lines.join("\n");
  const paymentLink = String(business?.payment_link || "").trim();
  const customNote = String(customMessage || "").trim();

  const html = emailLayout({
    title: "Event reminder",
    preheader: `Your event is in ${label.label}.`,
    logoUrl: { url: business?.logo_url || "", businessId: business?.id || "" },
    logoAlt: safeName(business?.business_name) || "DoBook",
    contentHtml: `
      ${paragraphHtml(`Just a reminder your event is coming up in <strong style="color:#18181b;">${escapeHtml(label.label)}</strong>.`)}
      ${customNote ? paragraphHtml(escapeHtml(customNote)) : ""}
      ${includeDetails ? bookingSummaryTableHtml({ booking }) : ""}
      ${includePaymentLink && paymentLink
        ? `
          <div style="margin-top:12px;">
            <a href="${escapeHtml(paymentLink)}" style="display:inline-block; background:#e11d48; color:#ffffff; padding:10px 14px; border-radius:999px; text-decoration:none; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; font-weight:700;">
              Pay now
            </a>
          </div>
        `
        : ""
      }
    `,
  });
  const text =
    `Event Reminder\n\nYour event is in ${label.label}.\n` +
    (customNote ? `\n${customNote}\n` : "") +
    (includeDetails && summaryText ? `\n${summaryText}\n` : "") +
    (includePaymentLink && paymentLink ? `\nPayment link: ${paymentLink}\n` : "");

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

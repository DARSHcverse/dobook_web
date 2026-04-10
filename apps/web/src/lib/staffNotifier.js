import { sendEmailViaResend } from "./email";
import { emailLayout, escapeHtml, paragraphHtml, safeEmail, safeName } from "./email/templates";
import { sendSMS, formatSMSDate, formatSMSTime } from "./sms";
import { staffAssignmentSMS } from "./smsTemplates";

function formatDurationMinutes(value) {
  const minutes = Number(value || 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} hour${hours === 1 ? "" : "s"}`;
  if (hours >= 1) return `${Math.round(hours * 10) / 10} hours`;
  return `${minutes} minutes`;
}

function detailsTableHtml({ booking, business, backdrop }) {
  const rows = [
    ["Business", safeName(business?.business_name)],
    ["Customer", safeName(booking?.customer_name)],
    ["Customer phone", safeName(booking?.customer_phone)],
    ["Date", safeName(booking?.booking_date)],
    ["Start time", safeName(booking?.booking_time)],
    ["Duration", formatDurationMinutes(booking?.duration_minutes)],
    ["Location", safeName(booking?.event_location)],
    ["Service", safeName(booking?.booth_type || booking?.service_type)],
    ["Backdrop", safeName(backdrop)],
    ["Notes", safeName(booking?.notes)],
  ].filter(([, v]) => String(v || "").trim());

  if (!rows.length) return "";

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

function detailsText({ booking, business, backdrop }) {
  const lines = [];
  const push = (label, value) => {
    const v = String(value || "").trim();
    if (!v) return;
    lines.push(`${label}: ${v}`);
  };
  push("Business", safeName(business?.business_name));
  push("Customer", safeName(booking?.customer_name));
  push("Customer phone", safeName(booking?.customer_phone));
  push("Date", safeName(booking?.booking_date));
  push("Start time", safeName(booking?.booking_time));
  push("Duration", formatDurationMinutes(booking?.duration_minutes));
  push("Location", safeName(booking?.event_location));
  push("Service", safeName(booking?.booth_type || booking?.service_type));
  push("Backdrop", safeName(backdrop));
  push("Notes", safeName(booking?.notes));
  if (!lines.length) return "";
  return lines.join("\n");
}

export async function notifyStaff({ staff, booking, business, backdrop }) {
  const staffEmail = safeEmail(staff?.email);
  const staffName = safeName(staff?.name) || "there";
  const businessName = safeName(business?.business_name) || "DoBook";
  const businessEmail = safeEmail(business?.email);
  const resolvedBackdrop = safeName(backdrop) || safeName(booking?.backdrop_notes);

  const results = { email: null, sms: null, whatsapp: null };

  if (staffEmail) {
    const subject = `You've been assigned a booking - ${businessName}`;
    const html = emailLayout({
      title: "Booking assignment",
      preheader: `${businessName} assigned you a booking.`,
      logoUrl: { url: business?.logo_url || "", businessId: business?.id || "" },
      logoAlt: businessName,
      contentHtml: `
        ${paragraphHtml(`Hi <strong style="color:#18181b;">${escapeHtml(staffName)}</strong> - you've been assigned a booking.`)}
        ${detailsTableHtml({ booking, business, backdrop: resolvedBackdrop })}
        ${paragraphHtml(`Reply to this email or contact <strong style="color:#18181b;">${escapeHtml(businessEmail || businessName)}</strong> if you have any questions.`)}
      `,
    });

    const text =
      `Booking assignment\n\n` +
      `Hi ${staffName}, you've been assigned a booking.\n\n` +
      `${detailsText({ booking, business, backdrop: resolvedBackdrop })}\n\n` +
      `Reply to this email or contact ${businessEmail || businessName} if you have any questions.\n`;

    results.email = await sendEmailViaResend({
      to: staffEmail,
      subject,
      html,
      text,
      replyTo: businessEmail || undefined,
    });
  } else {
    results.email = { ok: false, skipped: true, error: "No staff email" };
  }

  // SMS to staff (best-effort, non-blocking).
  const staffPhone = String(staff?.phone || "").trim();
  if (staffPhone && business?.sms_staff_notifications_enabled !== false) {
    sendSMS({
      to: staffPhone,
      message: staffAssignmentSMS({
        staffName: staffName,
        businessName: businessName,
        customerName: safeName(booking?.customer_name),
        service: safeName(booking?.booth_type || booking?.service_type),
        date: formatSMSDate(booking?.booking_date),
        time: formatSMSTime(booking?.booking_time),
        location: safeName(booking?.event_location) || null,
        backdrop: resolvedBackdrop || null,
      }),
    })
      .then((sid) => {
        results.sms = { ok: Boolean(sid), sid: sid || null };
      })
      .catch((e) => {
        console.error("[staffNotifier] SMS failed:", e?.message);
        results.sms = { ok: false, error: e?.message };
      });
  } else {
    results.sms = { ok: false, skipped: true, error: staffPhone ? "SMS notifications disabled" : "No staff phone" };
  }

  return results;
}

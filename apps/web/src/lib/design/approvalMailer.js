import { buildBusinessFrom, sendEmailViaResend } from "@/lib/email";
import {
  emailLayout,
  escapeHtml,
  paragraphHtml,
  resolveSiteUrl,
  safeEmail,
  safeName,
} from "@/lib/email/templates";

// Emails the rendered design to the customer for sign-off before the event.
//
// The preview is uploaded to storage first and referenced by URL: email clients
// cannot run a canvas, and inlining a 300-DPI PNG would blow past attachment
// limits and trip spam filters.

export async function sendDesignApprovalEmail({ booking, business, previewUrl, token, kind }) {
  const customerEmail = safeEmail(booking?.customer_email);
  if (!customerEmail) return { ok: false, skipped: true, error: "No customer email" };
  if (!previewUrl) return { ok: false, skipped: true, error: "No preview image" };

  const businessName = safeName(business?.business_name) || "your photo booth team";
  const customerName = safeName(booking?.customer_name) || "there";
  const businessEmail = safeEmail(business?.email);
  const site = resolveSiteUrl();
  const approveUrl = `${site}/design/${encodeURIComponent(token)}?action=approve`;
  const changesUrl = `${site}/design/${encodeURIComponent(token)}?action=changes`;
  const label = kind === "monogram" ? "monogram" : "photo strip";
  const bookingDate = safeName(booking?.booking_date);

  const subject = `Your ${label} design from ${businessName} — please approve`;

  const html = emailLayout({
    title: "Your design is ready",
    preheader: `${businessName} has designed your ${label}. Approve it or ask for changes.`,
    logoUrl: { url: business?.logo_url || "", businessId: business?.id || "" },
    logoAlt: businessName,
    senderName: businessName,
    contentHtml: `
      ${paragraphHtml(
        `Hi <strong style="color:#18181b;">${escapeHtml(customerName)}</strong> — here is the ${escapeHtml(label)} ` +
          `<strong style="color:#18181b;">${escapeHtml(businessName)}</strong> has designed for your event${
            bookingDate ? ` on ${escapeHtml(bookingDate)}` : ""
          }.`,
      )}
      <div style="margin-top:16px; text-align:center;">
        <img src="${escapeHtml(previewUrl)}" alt="Your ${escapeHtml(label)} design"
             style="max-width:280px; width:100%; height:auto; border:1px solid #e4e4e7; border-radius:12px; background:#ffffff;" />
      </div>
      ${paragraphHtml("Happy with it? Approve below and we'll have it ready on the day.")}
      <div style="margin-top:18px; text-align:center;">
        <a href="${escapeHtml(approveUrl)}"
           style="display:inline-block; background:#e11d48; color:#ffffff; padding:12px 26px; border-radius:999px; text-decoration:none; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; font-weight:700;">
          Approve design
        </a>
      </div>
      <div style="margin-top:12px; text-align:center;">
        <a href="${escapeHtml(changesUrl)}"
           style="display:inline-block; color:#52525b; padding:8px 18px; text-decoration:underline; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px;">
          Request a change
        </a>
      </div>
    `,
  });

  const text =
    `Your ${label} design from ${businessName}\n\n` +
    `Hi ${customerName} — here is the ${label} we've designed for your event` +
    (bookingDate ? ` on ${bookingDate}` : "") +
    `.\n\n` +
    `Preview: ${previewUrl}\n\n` +
    `Approve: ${approveUrl}\n` +
    `Request a change: ${changesUrl}\n`;

  return sendEmailViaResend({
    to: customerEmail,
    subject,
    html,
    text,
    from: buildBusinessFrom(business),
    replyTo: businessEmail || undefined,
  });
}

// Tells the business what the customer decided.
export async function sendDesignResponseEmail({ booking, business, approved, feedback }) {
  const businessEmail = safeEmail(business?.email);
  if (!businessEmail) return { ok: false, skipped: true, error: "No business email" };

  const customerName = safeName(booking?.customer_name) || "A customer";
  const bookingDate = safeName(booking?.booking_date);
  const note = String(feedback || "").trim();
  const site = resolveSiteUrl();

  const subject = approved
    ? `${customerName} approved their design`
    : `${customerName} requested a design change`;

  const html = emailLayout({
    title: approved ? "Design approved" : "Change requested",
    preheader: subject,
    contentHtml: `
      ${paragraphHtml(
        `<strong style="color:#18181b;">${escapeHtml(customerName)}</strong> ${
          approved ? "approved" : "asked for a change to"
        } their design${bookingDate ? ` for ${escapeHtml(bookingDate)}` : ""}.`,
      )}
      ${
        note
          ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4e4e7; border-radius:12px; background:#fff; margin-top:12px;">
               <tbody><tr><td style="padding:12px; color:#18181b; font-size:13px;">${escapeHtml(note)}</td></tr></tbody>
             </table>`
          : ""
      }
      <div style="margin-top:16px;">
        <a href="${escapeHtml(`${site}/dashboard`)}"
           style="display:inline-block; background:#e11d48; color:#ffffff; padding:10px 18px; border-radius:999px; text-decoration:none; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; font-weight:700;">
          Open dashboard →
        </a>
      </div>
    `,
  });

  const text =
    `${subject}\n\n` +
    `${customerName} ${approved ? "approved" : "asked for a change to"} their design` +
    (bookingDate ? ` for ${bookingDate}` : "") +
    `.\n` +
    (note ? `\nTheir note: ${note}\n` : "") +
    `\nDashboard: ${site}/dashboard\n`;

  return sendEmailViaResend({
    to: businessEmail,
    subject,
    html,
    text,
    replyTo: safeEmail(booking?.customer_email) || undefined,
  });
}

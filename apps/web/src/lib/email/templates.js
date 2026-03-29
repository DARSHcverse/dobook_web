export function resolveSiteUrl() {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit.replace(/\/+$/, "");
    return "https://www.do-book.com";
}

export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function safeEmail(value) {
    const s = String(value || "").trim();
    if (!s) return "";
    return s;
}

export function safeName(value) {
    return String(value || "").trim();
}

export function paragraphHtml(text) {
    return `<p style="margin:0 0 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; line-height:1.6; color:#3f3f46;">${text}</p>`;
}

export function parseEmailList(raw) {
    return String(raw || "")
        .split(/[,\s]+/g)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

export function resolveSignupNotifyRecipients() {
    const explicit = parseEmailList(process.env.SIGNUP_NOTIFY_EMAILS || process.env.SIGNUP_NOTIFY_EMAIL);
    if (explicit.length) return explicit;

    const support = parseEmailList(process.env.SUPPORT_EMAIL);
    if (support.length) return support;

    const owners = parseEmailList(process.env.OWNER_EMAILS);
    if (owners.length) return owners;

    return parseEmailList(process.env.RESEND_ACCOUNT_EMAIL);
}

export function bookingSummaryLines({ booking }) {
    const lines = [];
    if (booking?.booking_date) lines.push(`Date: ${booking.booking_date}`);
    if (booking?.booking_time) lines.push(`Start: ${booking.booking_time}`);
    if (booking?.event_location) lines.push(`Address: ${booking.event_location}`);
    if (booking?.booth_type) lines.push(`Booth/Service: ${booking.booth_type}`);
    else if (booking?.service_type) lines.push(`Booth/Service: ${booking.service_type}`);
    const qty = Math.max(1, Number(booking?.quantity || 1));
    const unit = Number(booking?.price || 0);
    const total = booking?.total_amount !== undefined && booking?.total_amount !== null
        ? Number(booking.total_amount || 0)
        : unit * qty;
    lines.push(`Total: $${Number(total || 0).toFixed(2)}`);
    return lines;
}

export function bookingSummaryTableHtml({ booking }) {
    const rows = [];
    if (booking?.booking_date) rows.push(["Date", booking.booking_date]);
    if (booking?.booking_time) rows.push(["Start", booking.booking_time]);
    if (booking?.event_location) rows.push(["Address", booking.event_location]);
    if (booking?.booth_type || booking?.service_type) rows.push(["Service", booking.booth_type || booking.service_type]);
    const qty = Math.max(1, Number(booking?.quantity || 1));
    const unit = Number(booking?.price || 0);
    const total = booking?.total_amount !== undefined && booking?.total_amount !== null
        ? Number(booking.total_amount || 0)
        : unit * qty;
    rows.push(["Total", `$${Number(total || 0).toFixed(2)}`]);

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

export function emailLayout({ title, preheader, contentHtml, logoUrl, logoAlt }) {
    const brand = "#e11d48";
    const bg = "#f4f4f5";
    const site = resolveSiteUrl();
    const defaultLogo = `${site}/brand/dobook-logo.png`;

    const resolveLogo = (raw, businessId) => {
        const s = String(raw || "").trim();
        if (!s) return defaultLogo;
        if (/^data:image\//i.test(s)) {
            if (!businessId) return defaultLogo;
            return `${site}/api/public/business-logo?business_id=${encodeURIComponent(String(businessId))}`;
        }
        if (/^https?:\/\//i.test(s)) return s;
        if (s.startsWith("/")) return `${site}${s}`;
        return `${site}/${s}`;
    };

    const logo = resolveLogo(logoUrl?.url, logoUrl?.businessId);
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

export function parseBookingDateUtc(bookingDateStr) {
    const s = String(bookingDateStr || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split("-").map((n) => Number(n));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return new Date(Date.UTC(y, m - 1, d, 9, 0, 0, 0)); // default 09:00 UTC
}

export function reminderAtUtc(eventAtUtc, daysBefore) {
    const d = new Date(eventAtUtc);
    d.setUTCDate(d.getUTCDate() - Number(daysBefore || 0));
    return d;
}

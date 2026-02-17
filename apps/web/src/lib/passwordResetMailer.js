import { sendEmailViaResend } from "./email";

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

function paragraph(text) {
  return `<p style="margin:0 0 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; line-height:1.6; color:#3f3f46;">${text}</p>`;
}

function emailLayout({ title, preheader, contentHtml }) {
  const bg = "#f4f4f5";
  const brand = "#e11d48";
  const site = resolveSiteUrl();

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
                      <img src="${site}/brand/dobook-logo.png" width="140" alt="DoBook" style="display:block; height:auto;" />
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
                      <div>If you didn’t request this, you can ignore this email.</div>
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

export async function sendPasswordResetEmail({ to, businessName, resetUrl }) {
  const subject = "Reset your DoBook password";
  const safeBiz = String(businessName || "").trim() || "your account";
  const safeUrl = String(resetUrl || "").trim();

  const html = emailLayout({
    title: "Password reset",
    preheader: "Reset your DoBook password.",
    contentHtml: `
      ${paragraph(`You requested a password reset for <strong style="color:#18181b;">${escapeHtml(safeBiz)}</strong>.`)}
      ${paragraph(`Click this link to set a new password:`)}
      <p style="margin:0 0 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; line-height:1.6;">
        <a href="${escapeHtml(safeUrl)}" style="color:#e11d48; text-decoration:none; font-weight:600;">Reset password</a>
      </p>
      ${paragraph(`This link expires in 1 hour.`)}
    `,
  });

  const text =
    `Password reset\n\n` +
    `You requested a password reset for ${safeBiz}.\n\n` +
    `Reset link (expires in 1 hour):\n${safeUrl}\n`;

  return sendEmailViaResend({ to, subject, html, text });
}


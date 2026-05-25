import { buildBusinessFrom, sendEmailViaResend } from "./email";

function resolveSiteUrl({ request }) {
  try {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit.replace(/\/+$/, "");
  } catch {
    // ignore
  }
  try {
    const u = new URL(request.url);
    return u.origin;
  } catch {
    return "https://www.do-book.com";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildReviewInviteUrl({ request, token }) {
  const base = resolveSiteUrl({ request });
  return `${base}/review/${encodeURIComponent(String(token || ""))}`;
}

export async function sendReviewInviteEmail({ request, to, business, businessName, customerName, inviteUrl }) {
  const safeTo = String(to || "").trim();
  if (!safeTo) return { ok: false, skipped: true, error: "No customer email" };

  const name = String(customerName || "").trim() || "there";
  const resolvedName = String(business?.business_name || businessName || "").trim();
  const biz = resolvedName || "the business";
  const url = String(inviteUrl || "").trim();
  const businessEmail = String(business?.email || "").trim();

  const subject = `How was your experience with ${biz}?`;
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#18181b;">
      <p style="margin:0 0 12px; font-size:14px; line-height:1.6;">Hi <strong>${escapeHtml(name)}</strong>,</p>
      <p style="margin:0 0 12px; font-size:14px; line-height:1.6;">
        ${escapeHtml(biz)} would love your feedback. It only takes a minute.
      </p>
      <p style="margin:16px 0;">
        <a href="${escapeHtml(url)}" style="display:inline-block; padding:12px 16px; border-radius:12px; background:#e11d48; color:#fff; text-decoration:none; font-weight:700;">
          Leave a review
        </a>
      </p>
      <p style="margin:0; font-size:12px; line-height:1.6; color:#71717a;">
        If the button doesn’t work, copy and paste this link into your browser:<br />
        <span style="word-break:break-all;">${escapeHtml(url)}</span>
      </p>
      <p style="margin:16px 0 0; font-size:12px; line-height:1.5; color:#71717a;">
        Sent by ${escapeHtml(biz)}<br />
        <span style="font-size:10px; color:#a1a1aa;">Powered by DoBook</span>
      </p>
    </div>
  `;

  const text =
    `Hi ${name},\n\n${biz} would love your feedback.\n\nLeave a review: ${url}\n\nSent by ${biz}\nPowered by DoBook\n`;
  return sendEmailViaResend({
    to: safeTo,
    subject,
    html,
    text,
    from: business ? buildBusinessFrom(business) : undefined,
    replyTo: businessEmail || undefined,
  });
}


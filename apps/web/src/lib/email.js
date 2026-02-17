export async function sendEmailViaResend({
  to,
  subject,
  html,
  text,
  attachments,
  replyTo,
  scheduledAt,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };

  const from = process.env.RESEND_FROM || "DoBook <onboarding@resend.dev>";
  const fromDomain = String(from).split("@")[1]?.replace(">", "")?.trim()?.toLowerCase() || "";

  const recipients = Array.isArray(to) ? to : [to];
  if (fromDomain === "resend.dev") {
    const allowedExtra = String(process.env.RESEND_ACCOUNT_EMAIL || "").trim().toLowerCase();
    const ok = recipients.every((r) => {
      const e = String(r || "").trim().toLowerCase();
      if (!e) return false;
      if (e.endsWith("@resend.dev")) return true;
      if (allowedExtra && e === allowedExtra) return true;
      return false;
    });

    if (!ok) {
      return {
        ok: false,
        skipped: true,
        error: "Unverified sender (onboarding@resend.dev) can only send to Resend test inboxes (@resend.dev) or RESEND_ACCOUNT_EMAIL.",
      };
    }
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
      text,
      reply_to: replyTo,
      scheduled_at: scheduledAt || undefined,
      attachments: (attachments || []).map((a) => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType,
      })),
    }),
  });

  if (!res.ok) {
    let detail = `Resend error (${res.status})`;
    try {
      const json = await res.json();
      detail = json?.message || json?.error?.message || detail;
    } catch {
      // ignore
    }
    return { ok: false, error: detail };
  }

  return { ok: true };
}

export async function sendEmailViaResend({
  to,
  subject,
  html,
  text,
  attachments,
  replyTo,
  scheduledAt,
}) {
  const parseEmailList = (raw) =>
    String(raw || "")
      .split(/[,\s]+/g)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };

  const from = process.env.RESEND_FROM || "DoBook <onboarding@resend.dev>";
  const fromDomain = String(from).split("@")[1]?.replace(">", "")?.trim()?.toLowerCase() || "";

  const recipients = Array.isArray(to) ? to : [to];
  if (fromDomain === "resend.dev") {
    const allowedExtra = String(process.env.RESEND_ACCOUNT_EMAIL || "").trim().toLowerCase();
    const allowedFromEnv = new Set([
      ...parseEmailList(process.env.OWNER_EMAILS),
      ...parseEmailList(process.env.SUPPORT_EMAIL),
      ...parseEmailList(process.env.SIGNUP_NOTIFY_EMAILS || process.env.SIGNUP_NOTIFY_EMAIL),
      ...(allowedExtra ? [allowedExtra] : []),
    ]);
    const ok = recipients.every((r) => {
      const e = String(r || "").trim().toLowerCase();
      if (!e) return false;
      if (e.endsWith("@resend.dev")) return true;
      if (allowedFromEnv.has(e)) return true;
      return false;
    });

    if (!ok) {
      return {
        ok: false,
        skipped: true,
        error:
          "Unverified sender (onboarding@resend.dev) can only send to @resend.dev or addresses in RESEND_ACCOUNT_EMAIL / SUPPORT_EMAIL / OWNER_EMAILS / SIGNUP_NOTIFY_EMAIL(S).",
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

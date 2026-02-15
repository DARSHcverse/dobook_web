export async function sendEmailViaResend({
  to,
  subject,
  html,
  text,
  attachments,
  replyTo,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };

  const from = process.env.RESEND_FROM || "DoBook <no-reply@dobook.app>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo,
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


import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";
import { sendEmailViaResend } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const subjectRaw = String(body?.subject || "").trim();
  const messageRaw = String(body?.message || "").trim();

  if (!subjectRaw || !messageRaw) {
    return NextResponse.json({ detail: "subject and message are required" }, { status: 400 });
  }

  const to =
    String(process.env.SUPPORT_EMAIL || "").trim() ||
    String(process.env.RESEND_ACCOUNT_EMAIL || "").trim();

  if (!to) {
    return NextResponse.json(
      { detail: "Support email is not configured. Set SUPPORT_EMAIL (recommended)." },
      { status: 500 },
    );
  }

  const business = auth.business || {};
  const businessName = String(business?.business_name || "").trim() || "Unknown business";
  const businessEmail = String(business?.email || "").trim();
  const businessId = String(business?.id || "").trim();

  const subject = `[DoBook Support] ${subjectRaw}`;
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin:0 0 12px;">Support request</h2>
      <p style="margin:0 0 8px;"><strong>Business:</strong> ${businessName}</p>
      <p style="margin:0 0 8px;"><strong>Business ID:</strong> ${businessId || "-"}</p>
      <p style="margin:0 0 16px;"><strong>Email:</strong> ${businessEmail || "-"}</p>
      <hr style="border:none; border-top:1px solid #eee; margin:16px 0;" />
      <p style="white-space: pre-wrap; margin:0;">${messageRaw.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>
    </div>
  `;
  const text =
    `Support request\n\n` +
    `Business: ${businessName}\n` +
    `Business ID: ${businessId || "-"}\n` +
    `Email: ${businessEmail || "-"}\n\n` +
    `---\n` +
    `${messageRaw}\n`;

  const result = await sendEmailViaResend({
    to,
    subject,
    html,
    text,
    replyTo: businessEmail || undefined,
  });

  if (!result?.ok) {
    return NextResponse.json({ detail: result?.error || "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";
import { sendEmailViaResend } from "@/lib/email";
import { logAdminActivity } from "@/lib/adminActivity";

export async function POST(request, { params }) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const { ticketId } = params;
    const body = await request.json().catch(() => ({}));
    const messageRaw = String(body?.message || "").trim();
    if (!messageRaw) {
      return NextResponse.json({ detail: "message is required" }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: ticket, error } = await sb
      .from("support_tickets")
      .select("id,business_id,business_email,subject")
      .eq("id", ticketId)
      .maybeSingle();

    if (error || !ticket) {
      return NextResponse.json({ detail: "Ticket not found" }, { status: 404 });
    }

    const to = String(ticket.business_email || "").trim();
    if (!to) {
      return NextResponse.json({ detail: "Ticket has no business email" }, { status: 400 });
    }

    const subject = `Re: ${ticket.subject || "DoBook support"}`;
    const safeMessage = messageRaw.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <p>${safeMessage.replaceAll("\n", "<br />")}</p>
        <p style="margin-top:16px;">— DoBook Support</p>
      </div>
    `;
    const text = `${messageRaw}\n\n— DoBook Support`;

    const result = await sendEmailViaResend({ to, subject, html, text });
    if (!result?.ok) {
      return NextResponse.json({ detail: result?.error || "Failed to send reply" }, { status: 500 });
    }

    const logResult = await logAdminActivity({
      adminEmail: auth.email,
      action: "support_ticket_reply",
      targetBusinessId: ticket?.business_id || null,
      details: { ticket_id: ticketId },
    });
    if (!logResult?.ok && logResult?.error) {
      console.error("Failed to log support reply", logResult);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error sending support reply:", error);
    return NextResponse.json({ detail: error?.message || "Failed to send reply" }, { status: 500 });
  }
}

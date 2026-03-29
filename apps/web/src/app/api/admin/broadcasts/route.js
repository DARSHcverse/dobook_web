import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";
import { sendEmailViaResend } from "@/lib/email";
import { logAdminActivity } from "@/lib/adminActivity";

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}

export async function POST(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();
    const audience = String(body?.audience || "all").trim().toLowerCase();

    if (!subject || !message) {
      return NextResponse.json({ detail: "subject and message are required" }, { status: 400 });
    }

    const allowed = new Set(["all", "pro", "free", "inactive"]);
    if (!allowed.has(audience)) {
      return NextResponse.json({ detail: "Invalid audience" }, { status: 400 });
    }

    let query = supabaseAdmin()
      .from("businesses")
      .select("id,business_name,email,subscription_plan,subscription_status");

    if (audience === "pro") query = query.eq("subscription_plan", "pro");
    if (audience === "free") query = query.eq("subscription_plan", "free");
    if (audience === "inactive") query = query.neq("subscription_status", "active");

    const { data: businesses, error } = await query;
    if (error) {
      return NextResponse.json({ detail: error.message || "Failed to load audience" }, { status: 500 });
    }

    const recipients = (businesses || [])
      .map((b) => ({ id: b.id, name: b.business_name, email: String(b.email || "").trim() }))
      .filter((b) => b.email);

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        ${message
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\n", "<br />")}
      </div>
    `;
    const text = message;

    let sentCount = 0;
    const batches = chunk(recipients, 20);
    for (const batch of batches) {
      const results = await Promise.all(
        batch.map((recipient) => sendEmailViaResend({ to: recipient.email, subject, html, text })),
      );
      results.forEach((result, idx) => {
        if (result?.ok) {
          sentCount += 1;
        } else {
          console.error("Broadcast send failed", {
            email: batch[idx]?.email,
            error: result?.error,
          });
        }
      });
    }

    await supabaseAdmin()
      .from("broadcasts")
      .insert({
        subject,
        audience,
        sent_count: sentCount,
        body: message,
      });

    const logResult = await logAdminActivity({
      adminEmail: auth.email,
      action: "send_broadcast",
      details: { audience, sent_count: sentCount, total: recipients.length },
    });
    if (!logResult?.ok && logResult?.error) {
      console.error("Failed to log broadcast activity", logResult);
    }

    return NextResponse.json({ sent_count: sentCount, total: recipients.length });
  } catch (error) {
    console.error("Error sending broadcast:", error);
    return NextResponse.json({ detail: error?.message || "Failed to send broadcast" }, { status: 500 });
  }
}

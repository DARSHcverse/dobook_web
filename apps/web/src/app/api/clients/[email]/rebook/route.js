import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/app/api/_utils/rateLimit";
import { hasProAccess } from "@/lib/entitlements";
import { sendRebookNudgeEmail } from "@/lib/bookingMailer";
import { resolveSiteUrl } from "@/lib/email/templates";

export const runtime = "nodejs";

// POST /api/clients/:email/rebook  { message? }
// Pro: email a returning client a link to book their next visit.
export async function POST(request, context) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  if (!hasProAccess(auth.business)) {
    return NextResponse.json({ detail: "Rebooking reminders are a Pro feature." }, { status: 403 });
  }

  const params = await context.params;
  const email = decodeURIComponent(String(params?.email || "")).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ detail: "Invalid email" }, { status: 400 });
  }

  // Only real clients of this business: DoBook must not become a way to
  // email arbitrary addresses.
  const { data: past, error } = await auth.supabase
    .from("bookings")
    .select("customer_name,customer_email")
    .eq("business_id", auth.business.id)
    // Escape LIKE wildcards so "%@%.%" cannot match every client.
    .ilike("customer_email", email.replace(/[\\%_]/g, (c) => `\\${c}`))
    .limit(1);
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!past?.length) return NextResponse.json({ detail: "Client not found" }, { status: 404 });

  const limited = await rateLimit({
    request,
    key: `crm:rebook:${auth.business.id}:${email}`,
    limit: 1,
    windowMs: 7 * 24 * 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ detail: "You already sent this client a reminder this week." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const site = resolveSiteUrl().replace(/\/+$/, "");
  const result = await sendRebookNudgeEmail({
    business: auth.business,
    customerEmail: email,
    customerName: past[0].customer_name,
    bookingUrl: `${site}/book/${auth.business.id}`,
    message: body?.message,
  });
  if (!result?.ok) return NextResponse.json({ detail: "Could not send the email. Try again shortly." }, { status: 502 });
  return NextResponse.json({ ok: true });
}

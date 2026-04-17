import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { hasStripeConfig, stripe } from "@/lib/stripeServer";
import { isOwnerBusiness } from "@/lib/entitlements";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request) {
  if (!hasStripeConfig()) {
    return NextResponse.json({ detail: "Stripe is not configured" }, { status: 500 });
  }

  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  if (isOwnerBusiness(auth.business)) {
    return NextResponse.json({ detail: "Owner account does not require billing" }, { status: 400 });
  }

  const subscriptionId = String(auth.business?.stripe_subscription_id || "").trim();
  if (!subscriptionId) {
    return NextResponse.json({ detail: "No active subscription found" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = String(body?.reason || "").slice(0, 200);

  const client = stripe();

  try {
    const updated = await client.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: { cancel_reason: reason },
    });

    const cancelAtSec = updated?.cancel_at || updated?.current_period_end || null;
    const cancelAtIso = cancelAtSec ? new Date(cancelAtSec * 1000).toISOString() : null;

    try {
      const sb = supabaseAdmin();
      await sb
        .from("businesses")
        .update({
          subscription_cancel_at: cancelAtIso,
          subscription_cancel_reason: reason || null,
        })
        .eq("id", auth.business.id);
    } catch (dbErr) {
      console.warn("[cancel] DB update warning:", dbErr?.message);
    }

    // Best-effort confirmation email
    try {
      const { sendCancellationEmail } = await import("@/lib/bookingMailer");
      if (typeof sendCancellationEmail === "function") {
        await sendCancellationEmail({ business: auth.business, cancelAt: cancelAtIso });
      }
    } catch {}

    return NextResponse.json({ cancelled: true, cancel_at: cancelAtIso });
  } catch (err) {
    console.error("[subscription/cancel] error:", err?.message);
    return NextResponse.json(
      { detail: err?.message || "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}

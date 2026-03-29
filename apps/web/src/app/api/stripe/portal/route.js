import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";
import { hasStripeConfig, stripe, appBaseUrlFromRequest } from "@/lib/stripeServer";
import { isOwnerBusiness } from "@/lib/entitlements";

export const runtime = "nodejs";

export async function POST(request) {
  if (!hasStripeConfig()) {
    return NextResponse.json(
      { detail: "Stripe is not configured (missing STRIPE_SECRET_KEY)" },
      { status: 500 },
    );
  }

  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  if (isOwnerBusiness(auth.business)) {
    return NextResponse.json({ detail: "This account has owner access and does not require billing." }, { status: 400 });
  }

  const customerId = String(auth.business?.stripe_customer_id || "").trim();
  if (!customerId) {
    return NextResponse.json(
      { detail: "No Stripe customer found for this account. Upgrade to Pro first." },
      { status: 400 },
    );
  }

  const baseUrl = appBaseUrlFromRequest(request);
  const client = stripe();

  const body = await request.json().catch(() => ({}));
  const flow = String(body?.flow || "").trim().toLowerCase();

  const baseParams = {
    customer: customerId,
    return_url: `${baseUrl}/dashboard?billing=1`,
  };

  const subscriptionId =
    String(body?.subscription_id || auth.business?.stripe_subscription_id || "").trim();

  const params =
    flow === "cancel" && subscriptionId
      ? {
          ...baseParams,
          flow_data: {
            type: "subscription_cancel",
            subscription_cancel: { subscription: subscriptionId },
          },
        }
      : baseParams;

  let portal;
  try {
    portal = await client.billingPortal.sessions.create(params);
  } catch (err) {
    // If the Stripe account doesn't have the cancellation flow enabled (or the API shape differs),
    // fall back to the normal portal so the user can still cancel from there.
    if (flow === "cancel") {
      portal = await client.billingPortal.sessions.create(baseParams);
    } else {
      throw err;
    }
  }

  return NextResponse.json({ url: portal.url });
}

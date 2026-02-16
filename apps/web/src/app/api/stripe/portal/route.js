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

  const portal = await client.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/dashboard?billing=1`,
  });

  return NextResponse.json({ url: portal.url });
}

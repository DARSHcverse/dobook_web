import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";
import { hasStripeConfig, stripe, appBaseUrlFromRequest } from "@/lib/stripeServer";
import { isOwnerBusiness } from "@/lib/entitlements";

export const runtime = "nodejs";

function badRequest(detail) {
  return NextResponse.json({ detail }, { status: 400 });
}

async function setBusinessStripeCustomerId(auth, stripeCustomerId) {
  if (!stripeCustomerId) return;

  if (auth.mode === "supabase") {
    await auth.supabase
      .from("businesses")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", auth.business.id);
    return;
  }

  auth.business.stripe_customer_id = stripeCustomerId;
  auth.saveDb(auth.db);
}

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
    return badRequest("This account has owner access and does not require billing.");
  }

  const body = await request.json().catch(() => ({}));
  const plan = String(body?.plan || "pro").trim().toLowerCase();
  if (plan !== "pro") return badRequest("Only the pro plan is supported");

  const priceId = process.env.STRIPE_PRICE_PRO_AUD?.trim();
  if (!priceId) {
    return NextResponse.json(
      { detail: "Missing STRIPE_PRICE_PRO_AUD (Stripe Price ID for the Pro plan)" },
      { status: 500 },
    );
  }

  const baseUrl = appBaseUrlFromRequest(request);
  const business = auth.business;

  const client = stripe();
  const existingCustomerId = String(business?.stripe_customer_id || "").trim();

  const customer =
    existingCustomerId
      ? { id: existingCustomerId }
      : await client.customers.create({
        email: business?.email || undefined,
        name: business?.business_name || "DoBook Business",
        metadata: { business_id: String(business?.id || "") },
      });

  if (!existingCustomerId) {
    await setBusinessStripeCustomerId(auth, customer.id);
  }

  const session = await client.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${baseUrl}/dashboard?upgraded=1`,
    cancel_url: `${baseUrl}/dashboard?upgrade=cancel`,
    metadata: {
      business_id: String(business?.id || ""),
      plan: "pro",
    },
  });

  return NextResponse.json({ url: session.url });
}

import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { hasStripeConfig, stripe } from "@/lib/stripeServer";
import { isOwnerBusiness } from "@/lib/entitlements";

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

  const client = stripe();

  try {
    // Create (or reuse) a 10%-off-for-2-months coupon
    const couponId = "dobook_retention_10_2m";
    let coupon;
    try {
      coupon = await client.coupons.retrieve(couponId);
    } catch {
      coupon = await client.coupons.create({
        id: couponId,
        percent_off: 10,
        duration: "repeating",
        duration_in_months: 2,
        name: "Retention 10% for 2 months",
      });
    }

    await client.subscriptions.update(subscriptionId, {
      coupon: coupon.id,
    });

    return NextResponse.json({ applied: true, coupon: coupon.id });
  } catch (err) {
    console.error("[retention-offer] error:", err?.message);
    return NextResponse.json(
      { detail: err?.message || "Failed to apply discount" },
      { status: 500 },
    );
  }
}

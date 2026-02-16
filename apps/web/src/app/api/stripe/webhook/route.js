import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";
import { hasStripeConfig, stripe } from "@/lib/stripeServer";
import { isOwnerEmail } from "@/lib/entitlements";

export const runtime = "nodejs";

function ok() {
  return NextResponse.json({ ok: true });
}

function updateFromStripeSubscription(subscription) {
  const status = String(subscription?.status || "inactive");
  const active = status === "active" || status === "trialing";
  const currentPeriodEnd =
    subscription?.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;

  const firstItem = subscription?.items?.data?.[0];
  const priceId = firstItem?.price?.id || null;

  return {
    stripe_subscription_id: subscription?.id || null,
    stripe_price_id: priceId,
    subscription_status: status,
    subscription_current_period_end: currentPeriodEnd,
    subscription_plan: active ? "pro" : "free",
  };
}

async function findBusinessByStripeCustomerId(customerId) {
  if (!customerId) return null;

  if (hasSupabaseConfig()) {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("businesses")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return data || null;
  }

  const db = readDb();
  const business = db.businesses.find((b) => String(b?.stripe_customer_id || "") === String(customerId));
  return business ? { mode: "localdb", db, business } : null;
}

async function applyBusinessUpdate(target, updates) {
  if (!target) return;

  const existing = target.mode === "localdb" ? target.business : target;
  const role = String(existing?.account_role || "").trim().toLowerCase();
  const owner = role === "owner" || isOwnerEmail(existing?.email);
  const nextUpdates =
    owner
      ? {
          ...updates,
          // Never downgrade owner access based on Stripe events.
          subscription_plan: "pro",
          subscription_status: existing?.subscription_status || "active",
        }
      : updates;

  if (target.mode === "localdb") {
    Object.assign(target.business, nextUpdates);
    writeDb(target.db);
    return;
  }

  const sb = supabaseAdmin();
  await sb.from("businesses").update(nextUpdates).eq("id", target.id);
}

export async function POST(request) {
  if (!hasStripeConfig()) {
    return NextResponse.json({ detail: "Stripe is not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json(
      { detail: "Missing STRIPE_WEBHOOK_SECRET or stripe-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    return NextResponse.json({ detail: err?.message || "Invalid signature" }, { status: 400 });
  }

  // Handle subscription lifecycle updates.
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerId = session?.customer;
      const subscriptionId = session?.subscription;
      if (!customerId || !subscriptionId) return ok();

      const subscription = await stripe().subscriptions.retrieve(String(subscriptionId), {
        expand: ["items.data.price"],
      });

      const target = await findBusinessByStripeCustomerId(String(customerId));
      if (!target) return ok();

      await applyBusinessUpdate(target, updateFromStripeSubscription(subscription));
      return ok();
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerId = subscription?.customer;
      if (!customerId) return ok();

      const target = await findBusinessByStripeCustomerId(String(customerId));
      if (!target) return ok();

      await applyBusinessUpdate(target, updateFromStripeSubscription(subscription));
      return ok();
    }

    return ok();
  } catch (err) {
    return NextResponse.json({ detail: err?.message || "Webhook handler failed" }, { status: 500 });
  }
}

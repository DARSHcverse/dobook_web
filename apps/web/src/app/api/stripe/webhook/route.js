import { NextResponse } from "next/server";
import { sendEmailViaResend } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isStripeEventsSchemaMissingError, stripeEventsSchemaDetail } from "@/lib/stripeEventsStore";
import { hasStripeConfig, stripe } from "@/lib/stripeServer";
import { isOwnerEmail } from "@/lib/entitlements";
import {
  buildStripeDashboardCustomerUrl,
  getStripeId,
  mapStripeEventStatus,
  normalizeStripeCurrency,
  stripeMinorUnitAmountToNumber,
} from "@/lib/stripePayments";

export const runtime = "nodejs";

const HANDLED_EVENT_TYPES = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
]);

function ok() {
  return NextResponse.json({ ok: true });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseEmailList(raw) {
  return String(raw || "")
    .split(/[,\s]+/g)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isoFromUnix(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return new Date(numeric * 1000).toISOString();
}

function firstInvoiceLine(invoice) {
  return Array.isArray(invoice?.lines?.data) ? invoice.lines.data[0] || null : null;
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

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("businesses")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data || null;
}

async function findBusinessById(businessId) {
  if (!businessId) return null;

  const sb = supabaseAdmin();
  const { data } = await sb.from("businesses").select("*").eq("id", businessId).maybeSingle();
  return data || null;
}

async function findBusinessByStripeSubscriptionId(subscriptionId) {
  if (!subscriptionId) return null;

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("businesses")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  return data || null;
}

async function findBusinessForStripeEvent({ metadataBusinessId, customerId, subscriptionId }) {
  if (metadataBusinessId) {
    const byId = await findBusinessById(metadataBusinessId);
    if (byId) return byId;
  }

  if (customerId) {
    const byCustomer = await findBusinessByStripeCustomerId(customerId);
    if (byCustomer) return byCustomer;
  }

  if (subscriptionId) {
    const bySubscription = await findBusinessByStripeSubscriptionId(subscriptionId);
    if (bySubscription) return bySubscription;
  }

  return null;
}

async function applyBusinessUpdate(target, updates) {
  if (!target) return;

  const role = String(target?.account_role || "").trim().toLowerCase();
  const owner = role === "owner" || isOwnerEmail(target?.email);
  const nextUpdates =
    owner
      ? {
        ...updates,
        // Never downgrade owner access based on Stripe events.
        subscription_plan: "pro",
        subscription_status: target?.subscription_status || "active",
      }
      : updates;

  if (
    updates?.subscription_status &&
    String(updates.subscription_status) !== String(target?.subscription_status || "")
  ) {
    nextUpdates.subscription_status_changed_at = new Date().toISOString();
  }

  const sb = supabaseAdmin();
  await sb.from("businesses").update(nextUpdates).eq("id", target.id);
}

async function stripeEventExists(stripeEventId) {
  const { data, error } = await supabaseAdmin()
    .from("stripe_events")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error) {
    if (isStripeEventsSchemaMissingError(error)) {
      return { exists: false, schemaReady: false };
    }
    throw error;
  }

  return { exists: Boolean(data?.id), schemaReady: true };
}

function getPaymentIntentFailureReason(paymentIntent) {
  const error = paymentIntent?.last_payment_error;
  return (
    error?.message ||
    error?.decline_code ||
    error?.code ||
    paymentIntent?.cancellation_reason ||
    ""
  );
}

async function getInvoiceFailureReason(invoice) {
  if (invoice?.last_finalization_error?.message) {
    return invoice.last_finalization_error.message;
  }

  const paymentIntentId = getStripeId(invoice?.payment_intent);
  if (!paymentIntentId) return "";

  try {
    const paymentIntent = await stripe().paymentIntents.retrieve(paymentIntentId);
    return getPaymentIntentFailureReason(paymentIntent);
  } catch (error) {
    console.error("Failed to retrieve Stripe payment intent for failed invoice", {
      invoiceId: invoice?.id,
      paymentIntentId,
      error: error?.message,
    });
    return "";
  }
}

function buildEventDescription({ eventType, object, fallbackDescription, failureReason }) {
  const existingDescription = String(fallbackDescription || object?.description || "").trim();
  if (existingDescription) {
    return failureReason ? `${existingDescription} (${failureReason})` : existingDescription;
  }

  const defaults = {
    "payment_intent.succeeded": "Payment succeeded",
    "payment_intent.payment_failed": "Payment failed",
    "invoice.paid": "Invoice paid",
    "invoice.payment_failed": "Invoice payment failed",
    "customer.subscription.created": "Subscription created",
    "customer.subscription.updated": "Subscription changed",
    "customer.subscription.deleted": "Subscription cancelled",
    "checkout.session.completed": "Checkout completed",
  };

  const base = defaults[eventType] || "Stripe event";
  return failureReason ? `${base} (${failureReason})` : base;
}

async function buildStripeEventRecord(event) {
  const object = event?.data?.object || {};
  const eventType = String(event?.type || "").trim();
  const metadataBusinessId = String(object?.metadata?.business_id || object?.client_reference_id || "").trim();

  let customerId = getStripeId(object?.customer);
  let subscriptionId = getStripeId(object?.subscription);
  let amount = null;
  let currency = normalizeStripeCurrency(object?.currency);
  let periodStart = null;
  let periodEnd = null;
  let failureReason = "";
  let fallbackDescription = "";
  let subscriptionForBusinessUpdate = null;

  if (eventType === "checkout.session.completed") {
    amount = stripeMinorUnitAmountToNumber(object?.amount_total ?? object?.amount_subtotal);
    subscriptionId = getStripeId(object?.subscription);
    customerId = customerId || getStripeId(object?.customer);
    if (subscriptionId) {
      subscriptionForBusinessUpdate = await stripe().subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });
      periodStart = isoFromUnix(subscriptionForBusinessUpdate?.current_period_start);
      periodEnd = isoFromUnix(subscriptionForBusinessUpdate?.current_period_end);
      const firstItem = subscriptionForBusinessUpdate?.items?.data?.[0];
      currency = normalizeStripeCurrency(firstItem?.price?.currency || object?.currency);
    }
  }

  if (eventType === "customer.subscription.created" || eventType === "customer.subscription.updated" || eventType === "customer.subscription.deleted") {
    subscriptionForBusinessUpdate = object;
    subscriptionId = getStripeId(object?.id);
    customerId = customerId || getStripeId(object?.customer);
    periodStart = isoFromUnix(object?.current_period_start);
    periodEnd = isoFromUnix(object?.current_period_end);
    const firstItem = object?.items?.data?.[0];
    amount = stripeMinorUnitAmountToNumber(firstItem?.price?.unit_amount ?? object?.plan?.amount);
    currency = normalizeStripeCurrency(firstItem?.price?.currency || object?.currency);
    fallbackDescription = firstItem?.price?.nickname || "";
  }

  if (eventType === "invoice.paid" || eventType === "invoice.payment_failed") {
    const invoice = object;
    const line = firstInvoiceLine(invoice);
    customerId = customerId || getStripeId(invoice?.customer);
    subscriptionId = subscriptionId || getStripeId(invoice?.subscription);
    amount = stripeMinorUnitAmountToNumber(invoice?.amount_paid ?? invoice?.amount_due ?? invoice?.total ?? line?.amount);
    currency = normalizeStripeCurrency(invoice?.currency || line?.currency);
    periodStart = isoFromUnix(line?.period?.start ?? invoice?.period_start);
    periodEnd = isoFromUnix(line?.period?.end ?? invoice?.period_end);
    fallbackDescription = invoice?.description || line?.description || "";
    if (eventType === "invoice.payment_failed") {
      failureReason = await getInvoiceFailureReason(invoice);
    }
  }

  if (eventType === "payment_intent.succeeded" || eventType === "payment_intent.payment_failed") {
    const paymentIntent = object;
    customerId = customerId || getStripeId(paymentIntent?.customer);
    amount = stripeMinorUnitAmountToNumber(paymentIntent?.amount_received ?? paymentIntent?.amount);
    currency = normalizeStripeCurrency(paymentIntent?.currency);
    fallbackDescription = paymentIntent?.description || "";
    if (eventType === "payment_intent.payment_failed") {
      failureReason = getPaymentIntentFailureReason(paymentIntent);
    }

    const invoiceId = getStripeId(paymentIntent?.invoice);
    if (invoiceId) {
      try {
        const invoice = await stripe().invoices.retrieve(invoiceId);
        const line = firstInvoiceLine(invoice);
        subscriptionId = subscriptionId || getStripeId(invoice?.subscription);
        periodStart = isoFromUnix(line?.period?.start ?? invoice?.period_start);
        periodEnd = isoFromUnix(line?.period?.end ?? invoice?.period_end);
        fallbackDescription = invoice?.description || line?.description || fallbackDescription;
      } catch (error) {
        console.error("Failed to retrieve Stripe invoice for payment intent", {
          paymentIntentId: paymentIntent?.id,
          invoiceId,
          error: error?.message,
        });
      }
    }
  }

  const business = await findBusinessForStripeEvent({
    metadataBusinessId,
    customerId,
    subscriptionId,
  });

  return {
    business,
    failureReason,
    subscriptionForBusinessUpdate,
    record: {
      business_id: business?.id || null,
      stripe_event_id: event.id,
      event_type: eventType,
      amount,
      currency,
      status: mapStripeEventStatus(eventType, object),
      description: buildEventDescription({
        eventType,
        object,
        fallbackDescription,
        failureReason,
      }),
      stripe_customer_id: customerId || null,
      stripe_subscription_id: subscriptionId || null,
      period_start: periodStart,
      period_end: periodEnd,
      created_at: event?.created ? new Date(event.created * 1000).toISOString() : new Date().toISOString(),
    },
  };
}

async function saveStripeEvent(record) {
  const { error } = await supabaseAdmin()
    .from("stripe_events")
    .upsert(record, { onConflict: "stripe_event_id" });

  if (error) {
    if (isStripeEventsSchemaMissingError(error)) {
      return { ok: false, schemaReady: false };
    }
    throw error;
  }

  return { ok: true, schemaReady: true };
}

async function sendFailedPaymentAlert({ business, record, failureReason }) {
  const recipients = parseEmailList(process.env.OWNER_EMAILS);
  if (!recipients.length) return;

  const businessName = String(business?.business_name || "Unknown business").trim();
  const businessEmail = String(business?.email || "").trim() || "-";
  const amount =
    Number.isFinite(Number(record?.amount)) ? `${Number(record.amount).toFixed(2)} ${String(record?.currency || "aud").toUpperCase()}` : "-";
  const reason = String(failureReason || "Stripe did not return a failure reason").trim();
  const dashboardUrl = buildStripeDashboardCustomerUrl(record?.stripe_customer_id);
  const subject = `DoBook payment failed: ${businessName}`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111827;">
      <h2 style="margin:0 0 16px; font-size:18px;">Payment failed</h2>
      <p style="margin:0 0 10px;"><strong>Business:</strong> ${escapeHtml(businessName)}</p>
      <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(businessEmail)}</p>
      <p style="margin:0 0 10px;"><strong>Amount:</strong> ${escapeHtml(amount)}</p>
      <p style="margin:0 0 10px;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p style="margin:16px 0 0;">
        <a href="${escapeHtml(dashboardUrl)}" style="color:#e11d48; text-decoration:none; font-weight:600;">
          Open Stripe customer
        </a>
      </p>
    </div>
  `;

  const text = [
    "Payment failed",
    `Business: ${businessName}`,
    `Email: ${businessEmail}`,
    `Amount: ${amount}`,
    `Reason: ${reason}`,
    `Stripe customer: ${dashboardUrl}`,
  ].join("\n");

  const result = await sendEmailViaResend({
    to: recipients,
    subject,
    html,
    text,
  });

  if (!result?.ok) {
    console.error("Failed payment alert email failed", {
      businessId: business?.id,
      stripeEventId: record?.stripe_event_id,
      error: result?.error,
    });
  }
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

  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    return ok();
  }

  try {
    const eventState = await stripeEventExists(event.id);
    const { business, failureReason, subscriptionForBusinessUpdate, record } = await buildStripeEventRecord(event);

    if (subscriptionForBusinessUpdate && business) {
      await applyBusinessUpdate(business, updateFromStripeSubscription(subscriptionForBusinessUpdate));
    }

    const saveResult = eventState.schemaReady ? await saveStripeEvent(record) : { ok: false, schemaReady: false };

    if (!saveResult.schemaReady) {
      console.warn(stripeEventsSchemaDetail());
      return ok();
    }

    if (!eventState.exists && (event.type === "payment_intent.payment_failed" || event.type === "invoice.payment_failed")) {
      await sendFailedPaymentAlert({
        business,
        record,
        failureReason,
      });
    }

    return ok();
  } catch (err) {
    console.error("Stripe webhook handler failed", {
      eventType: event?.type,
      stripeEventId: event?.id,
      error: err,
    });
    return NextResponse.json({ detail: err?.message || "Webhook handler failed" }, { status: 500 });
  }
}

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const STRIPE_EVENTS_MIGRATION_NAME = "20260330120000_stripe_events.sql";
export const STRIPE_EVENTS_SELECT_FIELDS =
  "id,business_id,stripe_event_id,event_type,amount,currency,status,description,stripe_customer_id,stripe_subscription_id,period_start,period_end,created_at";

export function stripeEventsSchemaDetail() {
  return `Stripe payments schema is not ready. Apply Supabase migration ${STRIPE_EVENTS_MIGRATION_NAME}.`;
}

export function isStripeEventsSchemaMissingError(error) {
  const code = String(error?.code || "").trim().toUpperCase();
  const message = `${String(error?.message || "")} ${String(error?.details || "")}`.toLowerCase();

  if (code === "42P01") return true;
  if (message.includes("stripe_events") && message.includes("does not exist")) return true;
  if (message.includes("relation") && message.includes("stripe_events")) return true;
  return false;
}

export async function listStripeEventsWithBusinesses() {
  const sb = supabaseAdmin();
  const { data: rawEvents, error } = await sb
    .from("stripe_events")
    .select(STRIPE_EVENTS_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    if (isStripeEventsSchemaMissingError(error)) {
      return {
        schemaReady: false,
        detail: stripeEventsSchemaDetail(),
        events: [],
      };
    }
    throw error;
  }

  const businessIds = [...new Set((rawEvents || []).map((event) => event?.business_id).filter(Boolean))];
  let businessMap = new Map();

  if (businessIds.length) {
    const { data: businesses, error: businessError } = await sb
      .from("businesses")
      .select("id,business_name,email")
      .in("id", businessIds);

    if (businessError) throw businessError;
    businessMap = new Map((businesses || []).map((business) => [business.id, business]));
  }

  return {
    schemaReady: true,
    detail: "",
    events: (rawEvents || []).map((event) => ({
      ...event,
      businesses: event?.business_id ? businessMap.get(event.business_id) || null : null,
    })),
  };
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";
import { STRIPE_EVENTS_SELECT_FIELDS, isStripeEventsSchemaMissingError } from "@/lib/stripeEventsStore";
import { FREE_PLAN_MAX_BOOKINGS_PER_MONTH, getFreePlanUsage } from "@/lib/entitlements";

function monthRangeUtc(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function GET(request, context) {
  const params = await context.params;
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const { businessId } = params;
    const sb = supabaseAdmin();

    // Full profile incl. region + subscription/billing fields.
    const { data: business, error: businessError } = await sb
      .from("businesses")
      .select(
        [
          "id,business_name,email,phone,business_address,abn",
          "subscription_plan,subscription_status,subscription_status_changed_at",
          "stripe_customer_id,stripe_subscription_id,subscription_current_period_end,subscription_cancel_at,subscription_cancel_reason",
          "country_code,currency,distance_unit,timezone",
          "business_type,industry,account_role,admin_notes,created_at",
        ].join(","),
      )
      .eq("id", businessId)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ detail: "Business not found" }, { status: 404 });
    }

    const { startIso, endIso } = monthRangeUtc();

    const [
      { count: bookingsCount },
      { count: bookingsThisMonth },
      { data: bookings },
      { data: recentBookings },
      { data: lastSession },
    ] = await Promise.all([
      sb.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId),
      sb
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", startIso)
        .lt("created_at", endIso),
      sb.from("bookings").select("total_amount,price,quantity").eq("business_id", businessId),
      sb
        .from("bookings")
        .select("id,customer_name,booking_date,booking_time,status,total_amount,price,quantity,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(8),
      sb
        .from("sessions")
        .select("created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const totalRevenue = (bookings || []).reduce((sum, b) => {
      const total =
        b?.total_amount !== undefined && b?.total_amount !== null
          ? Number(b.total_amount)
          : Number(b?.price || 0) * Math.max(1, Number(b?.quantity || 1));
      return Number.isFinite(total) ? sum + total : sum;
    }, 0);

    // This business's Stripe payment history (best-effort; empty if schema absent).
    let payments = [];
    let paymentsSchemaReady = true;
    try {
      const { data: events, error: payErr } = await sb
        .from("stripe_events")
        .select(STRIPE_EVENTS_SELECT_FIELDS)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (payErr) {
        if (isStripeEventsSchemaMissingError(payErr)) paymentsSchemaReady = false;
        else throw payErr;
      } else {
        payments = events || [];
      }
    } catch (e) {
      console.error("[admin detail] payments load failed:", e?.message);
      paymentsSchemaReady = false;
    }

    const usage = getFreePlanUsage(business, bookingsThisMonth || 0);

    return NextResponse.json({
      business: { ...business, password_hash: undefined },
      stats: {
        bookings_count: bookingsCount || 0,
        bookings_this_month: bookingsThisMonth || 0,
        total_revenue: totalRevenue,
        last_login_at: lastSession?.created_at || null,
        free_limit: FREE_PLAN_MAX_BOOKINGS_PER_MONTH,
        free_remaining: usage.unlimited ? null : usage.remaining,
        is_unlimited: usage.unlimited,
      },
      recent_bookings: recentBookings || [],
      payments,
      payments_schema_ready: paymentsSchemaReady,
    });
  } catch (error) {
    console.error("Error fetching business detail:", error);
    return NextResponse.json({ detail: error?.message || "Failed to load business" }, { status: 500 });
  }
}

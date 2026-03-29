import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildMonthlyRevenueSeries,
  isCanonicalFailedEvent,
  isCanonicalPaidEvent,
  isInCurrentUtcMonth,
  serializeStripeEventRow,
  sumStripeEventAmounts,
} from "@/lib/stripePayments";

export async function GET(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const sb = supabaseAdmin();
    const [{ data: rawEvents, error: eventsError }, { count: activeSubscriptions, error: subsError }] = await Promise.all([
      sb
        .from("stripe_events")
        .select(
          "id,business_id,stripe_event_id,event_type,amount,currency,status,description,stripe_customer_id,stripe_subscription_id,period_start,period_end,created_at",
        )
        .order("created_at", { ascending: false }),
      sb
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("subscription_plan", "pro")
        .eq("subscription_status", "active"),
    ]);

    if (eventsError) throw eventsError;
    if (subsError) throw subsError;

    const events = (rawEvents || []).map(serializeStripeEventRow);
    const paidEvents = events.filter(isCanonicalPaidEvent);
    const monthlyRevenueEvents = paidEvents.filter((event) => isInCurrentUtcMonth(event.created_at));
    const failedPaymentsThisMonth = events.filter(
      (event) => isCanonicalFailedEvent(event) && isInCurrentUtcMonth(event.created_at),
    );

    return NextResponse.json({
      monthlyRevenue: Number(sumStripeEventAmounts(monthlyRevenueEvents).toFixed(2)),
      totalPaid: Number(sumStripeEventAmounts(paidEvents).toFixed(2)),
      failedPayments: failedPaymentsThisMonth.length,
      activeSubscriptions: activeSubscriptions || 0,
      breakdown: buildMonthlyRevenueSeries(events, 12),
    });
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    return NextResponse.json({ detail: error?.message || "Failed to load payment stats" }, { status: 500 });
  }
}

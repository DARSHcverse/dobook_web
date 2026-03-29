import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { listStripeEventsWithBusinesses } from "@/lib/stripeEventsStore";
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
    const [{ schemaReady, detail, events: rawEvents }, { count: activeSubscriptions, error: subsError }] = await Promise.all([
      listStripeEventsWithBusinesses(),
      sb
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("subscription_plan", "pro")
        .eq("subscription_status", "active"),
    ]);

    if (subsError) throw subsError;

    const events = (rawEvents || []).map(serializeStripeEventRow);
    const paidEvents = events.filter(isCanonicalPaidEvent);
    const monthlyRevenueEvents = paidEvents.filter((event) => isInCurrentUtcMonth(event.created_at));
    const failedPaymentsThisMonth = events.filter(
      (event) => isCanonicalFailedEvent(event) && isInCurrentUtcMonth(event.created_at),
    );

    return NextResponse.json({
      schemaReady,
      detail,
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

import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePaymentStatus, serializeStripeEventRow } from "@/lib/stripePayments";

export async function GET(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const status = normalizePaymentStatus(url.searchParams.get("status"), { allowAll: true });
    if (!status) {
      return NextResponse.json({ detail: "Invalid status filter" }, { status: 400 });
    }

    let query = supabaseAdmin()
      .from("stripe_events")
      .select(
        "id,business_id,stripe_event_id,event_type,amount,currency,status,description,stripe_customer_id,stripe_subscription_id,period_start,period_end,created_at,businesses(business_name,email)",
      )
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      payments: (data || []).map(serializeStripeEventRow),
    });
  } catch (error) {
    console.error("Error fetching admin payments:", error);
    return NextResponse.json({ detail: error?.message || "Failed to load payments" }, { status: 500 });
  }
}

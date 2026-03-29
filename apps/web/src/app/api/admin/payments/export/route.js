import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { listStripeEventsWithBusinesses } from "@/lib/stripeEventsStore";
import { escapeCsvCell, serializeStripeEventRow } from "@/lib/stripePayments";

export async function GET(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const { schemaReady, detail, events } = await listStripeEventsWithBusinesses();
    const payments = (events || []).map(serializeStripeEventRow);
    const headers = [
      "Business Name",
      "Business Email",
      "Amount",
      "Currency",
      "Status",
      "Type",
      "Period",
      "Date",
      "Event Type",
      "Description",
      "Stripe Event ID",
      "Stripe Customer ID",
      "Stripe Subscription ID",
    ];

    const rows = payments.map((payment) => [
      payment.business_name,
      payment.business_email,
      payment.amount.toFixed(2),
      payment.currency.toUpperCase(),
      payment.status,
      payment.payment_type_label,
      payment.period_label,
      payment.created_at || "",
      payment.event_type,
      payment.description,
      payment.stripe_event_id,
      payment.stripe_customer_id,
      payment.stripe_subscription_id,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="dobook-payments.csv"',
        "Cache-Control": "no-store",
        "X-DoBook-Payments-Schema": schemaReady ? "ready" : "missing",
        "X-DoBook-Payments-Detail": schemaReady ? "" : detail,
      },
    });
  } catch (error) {
    console.error("Error exporting payments:", error);
    return NextResponse.json({ detail: error?.message || "Failed to export payments" }, { status: 500 });
  }
}

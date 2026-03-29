import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { listStripeEventsWithBusinesses } from "@/lib/stripeEventsStore";
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

    const { schemaReady, detail, events } = await listStripeEventsWithBusinesses();
    const rows = (events || []).map(serializeStripeEventRow);
    const payments = status === "all" ? rows : rows.filter((row) => row.status === status);

    return NextResponse.json({
      schemaReady,
      detail,
      payments,
    });
  } catch (error) {
    console.error("Error fetching admin payments:", error);
    return NextResponse.json({ detail: error?.message || "Failed to load payments" }, { status: 500 });
  }
}

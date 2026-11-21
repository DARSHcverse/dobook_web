import BookingWidget from "@/components/booking/BookingWidget";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildWidgetInfo } from "@/lib/widgetInfo";

// Server-rendered so customers see the business and form on first paint,
// instead of a loading screen while the browser fetches the same data.
// Availability is still fetched live in the browser (it changes by the minute).
export const dynamic = "force-dynamic";

export default async function BookingWidgetPage({ params }) {
  const { businessId } = await params;
  let initialBusiness = null;
  try {
    const { status, body } = await buildWidgetInfo(supabaseAdmin(), businessId);
    if (status === 200) initialBusiness = body;
  } catch (e) {
    // Fall back to the client fetch rather than failing the page.
    console.error("[book] server prefetch failed:", e?.message);
  }
  return <BookingWidget initialBusiness={initialBusiness} businessId={businessId} />;
}

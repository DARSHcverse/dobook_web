import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";

export async function GET(request, { params }) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const { businessId } = params;
    const sb = supabaseAdmin();

    const { data: business, error: businessError } = await sb
      .from("businesses")
      .select(
        "id,business_name,email,subscription_plan,subscription_status,created_at,business_type,industry,account_role,admin_notes",
      )
      .eq("id", businessId)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ detail: "Business not found" }, { status: 404 });
    }

    const [{ count: bookingsCount }, { data: bookings }, { data: lastSession }] = await Promise.all([
      sb.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId),
      sb.from("bookings").select("total_amount,price,quantity").eq("business_id", businessId),
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
      if (!Number.isFinite(total)) return sum;
      return sum + total;
    }, 0);

    return NextResponse.json({
      business: {
        ...business,
        password_hash: undefined,
      },
      stats: {
        bookings_count: bookingsCount || 0,
        total_revenue: totalRevenue,
        last_login_at: lastSession?.created_at || null,
      },
    });
  } catch (error) {
    console.error("Error fetching business detail:", error);
    return NextResponse.json({ detail: error?.message || "Failed to load business" }, { status: 500 });
  }
}

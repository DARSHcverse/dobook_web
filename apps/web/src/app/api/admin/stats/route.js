import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const sb = supabaseAdmin();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthStartIso = monthStart.toISOString();

    const [
      totalBusinesses,
      freeBusinesses,
      proBusinesses,
      activeBusinesses,
      inactiveBusinesses,
      proActiveBusinesses,
      newSignupsThisMonth,
      bookingsThisMonth,
      churnThisMonth,
      openTickets,
    ] = await Promise.all([
      sb.from("businesses").select("id", { count: "exact", head: true }),
      sb.from("businesses").select("id", { count: "exact", head: true }).eq("subscription_plan", "free"),
      sb.from("businesses").select("id", { count: "exact", head: true }).eq("subscription_plan", "pro"),
      sb.from("businesses").select("id", { count: "exact", head: true }).eq("subscription_status", "active"),
      sb.from("businesses").select("id", { count: "exact", head: true }).neq("subscription_status", "active"),
      sb.from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("subscription_plan", "pro")
        .eq("subscription_status", "active"),
      sb.from("businesses").select("id", { count: "exact", head: true }).gte("created_at", monthStartIso),
      sb.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", monthStartIso),
      sb
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .in("subscription_status", ["inactive", "cancelled"])
        .gte("subscription_status_changed_at", monthStartIso),
      sb.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);

    const proActiveCount = proActiveBusinesses.count || 0;
    const monthlyRevenue = proActiveCount * 20;

    return NextResponse.json({
      total: totalBusinesses.count || 0,
      free: freeBusinesses.count || 0,
      pro: proBusinesses.count || 0,
      active: activeBusinesses.count || 0,
      inactive: inactiveBusinesses.count || 0,
      monthlyRevenue,
      newSignupsThisMonth: newSignupsThisMonth.count || 0,
      bookingsThisMonth: bookingsThisMonth.count || 0,
      churnThisMonth: churnThisMonth.count || 0,
      openTickets: openTickets.count || 0,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { detail: error?.message || "Failed to load stats" },
      { status: 500 },
    );
  }
}

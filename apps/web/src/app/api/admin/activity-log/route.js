import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

    const { data, error } = await supabaseAdmin()
      .from("admin_activity_log")
      .select("id,admin_email,action,target_business_id,details,created_at,businesses(business_name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const logs = (data || []).map((log) => ({
      ...log,
      business_name: log?.businesses?.business_name || "",
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return NextResponse.json({ detail: error?.message || "Failed to load activity log" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const status = String(url.searchParams.get("status") || "all").trim().toLowerCase();

    let query = supabaseAdmin()
      .from("support_tickets")
      .select("id,business_id,business_email,subject,message,status,created_at,resolved_at,businesses(business_name)")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const tickets = (data || []).map((t) => ({
      ...t,
      business_name: t?.businesses?.business_name || "",
    }));

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json({ detail: error?.message || "Failed to fetch tickets" }, { status: 500 });
  }
}

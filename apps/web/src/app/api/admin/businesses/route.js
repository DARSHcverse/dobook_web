import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const sb = supabaseAdmin();
    const { data: businesses, error } = await sb.from("businesses").select("*");

    if (error) throw error;

    // Remove password hashes from response
    const sanitizedBusinesses = (businesses || []).map(business => {
      const { password_hash, ...sanitized } = business;
      return sanitized;
    });

    return NextResponse.json({
      businesses: sanitizedBusinesses,
      total: sanitizedBusinesses.length
    });

  } catch (error) {
    console.error("Error fetching businesses:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch businesses" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { readDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    let businesses = [];

    if (hasSupabaseConfig()) {
      const sb = supabaseAdmin();
      const { data, error } = await sb.from("businesses").select("*");
      if (error) throw error;
      businesses = data || [];
    } else {
      const db = readDb();
      businesses = db.businesses || [];
    }

    // Remove password hashes from response
    const sanitizedBusinesses = businesses.map(business => {
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

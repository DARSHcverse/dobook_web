import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request, { params }) {
  try {
    const { businessId } = params;

    if (hasSupabaseConfig()) {
      // Update in Supabase
      const { data: business, error } = await supabaseAdmin()
        .from("businesses")
        .update({
          subscription_plan: "pro",
          subscription_status: "active",
          updated_at: new Date().toISOString()
        })
        .eq("id", businessId)
        .select()
        .single();

      if (error) {
        console.error("Error upgrading business:", error);
        return NextResponse.json(
          { detail: "Failed to upgrade business" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ...business,
        message: "Business upgraded to pro plan successfully"
      });
    } else {
      // Update in local database
      const db = readDb();
      const business = db.businesses.find(b => b.id === businessId);
      
      if (!business) {
        return NextResponse.json(
          { detail: "Business not found" },
          { status: 404 }
        );
      }

      // Upgrade to pro plan
      business.subscription_plan = "pro";
      business.subscription_status = "active";
      business.updated_at = new Date().toISOString();

      writeDb(db);

      const { password_hash, ...safeBusiness } = business;
      return NextResponse.json({
        ...safeBusiness,
        message: "Business upgraded to pro plan successfully"
      });
    }

  } catch (error) {
    console.error("Error in admin businesses upgrade:", error);
    return NextResponse.json(
      { detail: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

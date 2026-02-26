import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { isOwnerBusiness } from "@/lib/entitlements";

export async function POST(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  // Check if the authenticated user is an owner
  if (!isOwnerBusiness(auth.business)) {
    return NextResponse.json(
      { detail: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    const { businessId } = params;

    if (auth.mode === "localdb") {
      // Update in local database
      const business = auth.db.businesses.find(b => b.id === businessId);
      
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

      auth.saveDb(auth.db);

      const { password_hash, ...safeBusiness } = business;
      return NextResponse.json({
        ...safeBusiness,
        message: "Business upgraded to pro plan successfully"
      });

    } else {
      // Update in Supabase
      const { data: business, error } = await auth.supabase
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
    }

  } catch (error) {
    console.error("Error in admin businesses upgrade:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

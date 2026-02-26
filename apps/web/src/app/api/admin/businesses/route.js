import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { isOwnerBusiness } from "@/lib/entitlements";

export async function GET(request) {
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
    let businesses;

    if (auth.mode === "localdb") {
      // For local database, return all businesses without password hashes
      businesses = auth.db.businesses.map(business => {
        const { password_hash, ...safeBusiness } = business;
        return safeBusiness;
      });
    } else {
      // For Supabase, fetch all businesses
      const { data: businessesData, error } = await auth.supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching businesses:", error);
        return NextResponse.json(
          { detail: "Failed to fetch businesses" },
          { status: 500 }
        );
      }

      businesses = businessesData;
    }

    return NextResponse.json({
      businesses,
      total: businesses.length
    });

  } catch (error) {
    console.error("Error in admin businesses GET:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request, { params }) {
  try {
    const { businessId } = params;

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

  } catch (error) {
    console.error("Error in admin businesses upgrade:", error);
    return NextResponse.json(
      { detail: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

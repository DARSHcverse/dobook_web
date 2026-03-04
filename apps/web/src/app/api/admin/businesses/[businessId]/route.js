import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(request, { params }) {
  try {
    const { businessId } = params;
    const updateData = await request.json();

    const nameRaw = updateData?.business_name ?? updateData?.name;
    const emailRaw = updateData?.email;
    const name = nameRaw !== undefined ? String(nameRaw).trim() : undefined;
    const email = emailRaw !== undefined ? String(emailRaw).trim().toLowerCase() : undefined;
    const subscription_plan =
      updateData?.subscription_plan !== undefined ? String(updateData.subscription_plan).trim().toLowerCase() : undefined;
    const subscription_status =
      updateData?.subscription_status !== undefined ? String(updateData.subscription_status).trim().toLowerCase() : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json({ detail: "business_name cannot be empty" }, { status: 400 });
    }
    if (email !== undefined && !email) {
      return NextResponse.json({ detail: "email cannot be empty" }, { status: 400 });
    }

    const allowedPlans = new Set(["free", "pro"]);
    if (subscription_plan !== undefined && subscription_plan && !allowedPlans.has(subscription_plan)) {
      return NextResponse.json({ detail: "Invalid subscription_plan" }, { status: 400 });
    }
    const allowedStatuses = new Set(["active", "inactive", "cancelled"]);
    if (subscription_status !== undefined && subscription_status && !allowedStatuses.has(subscription_status)) {
      return NextResponse.json({ detail: "Invalid subscription_status" }, { status: 400 });
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.business_name = name;
    if (email !== undefined) updates.email = email;
    if (updateData.phone !== undefined) updates.phone = updateData.phone || "";
    if (updateData.business_address !== undefined) updates.business_address = updateData.business_address || "";
    if (updateData.abn !== undefined) updates.abn = updateData.abn || "";
    if (subscription_plan !== undefined) updates.subscription_plan = subscription_plan || "free";
    if (subscription_status !== undefined) updates.subscription_status = subscription_status || "inactive";

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ detail: "No updates provided" }, { status: 400 });
    }

    const { data: business, error } = await supabaseAdmin()
      .from("businesses")
      .update(updates)
      .eq("id", businessId)
      .select()
      .single();

    if (error) {
      console.error("Error updating business:", error);
      return NextResponse.json(
        { detail: "Failed to update business" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...business,
      message: "Business updated successfully"
    });

  } catch (error) {
    console.error("Error in admin businesses PUT:", error);
    return NextResponse.json(
      { detail: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { businessId } = params;

    const { error } = await supabaseAdmin()
      .from("businesses")
      .delete()
      .eq("id", businessId);

    if (error) {
      console.error("Error deleting business:", error);
      return NextResponse.json(
        { detail: "Failed to delete business" },
        { status: 500 }
      );
    }

    return NextResponse.json({ detail: "Business deleted successfully" });

  } catch (error) {
    console.error("Error in admin businesses DELETE:", error);
    return NextResponse.json(
      { detail: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

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

    if (hasSupabaseConfig()) {
      // Update in Supabase
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

      // Update business fields
      if (name !== undefined) business.business_name = name;
      if (email !== undefined) business.email = email;
      if (updateData.phone !== undefined) business.phone = updateData.phone || "";
      if (updateData.business_address !== undefined) business.business_address = updateData.business_address || "";
      if (updateData.abn !== undefined) business.abn = updateData.abn || "";
      if (subscription_plan !== undefined) business.subscription_plan = subscription_plan || "free";
      if (subscription_status !== undefined) business.subscription_status = subscription_status || "inactive";
      business.updated_at = new Date().toISOString();

      writeDb(db);

      const { password_hash, ...safeBusiness } = business;
      return NextResponse.json({
        ...safeBusiness,
        message: "Business updated successfully"
      });
    }

  } catch (error) {
    console.error("Error in admin businesses PUT:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { businessId } = params;

    if (hasSupabaseConfig()) {
      // Delete from Supabase
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
    }
    // Delete from local database
    const db = readDb();
    const before = (db.businesses || []).length;
    db.businesses = (db.businesses || []).filter((b) => b.id !== businessId);
    if (db.businesses.length === before) {
      return NextResponse.json({ detail: "Business not found" }, { status: 404 });
    }

    db.sessions = (db.sessions || []).filter((s) => s.businessId !== businessId && s.business_id !== businessId);
    db.bookings = (db.bookings || []).filter((b) => b.business_id !== businessId && b.businessId !== businessId);
    db.invoiceTemplates = (db.invoiceTemplates || []).filter((t) => t.business_id !== businessId && t.businessId !== businessId);
    db.passwordResetTokens = (db.passwordResetTokens || []).filter((t) => t.businessId !== businessId && t.business_id !== businessId);
    db.extractions = (db.extractions || []).filter((e) => e.business_id !== businessId && e.businessId !== businessId);
    db.invoices = (db.invoices || []).filter((inv) => inv.business_id !== businessId && inv.businessId !== businessId);

    writeDb(db);

    return NextResponse.json({ detail: "Business deleted successfully" });

  } catch (error) {
    console.error("Error in admin businesses DELETE:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { isOwnerBusiness } from "@/lib/entitlements";

export async function PUT(request, { params }) {
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
    const updateData = await request.json();

    // Validate required fields
    if (!updateData.name || !updateData.email) {
      return NextResponse.json(
        { detail: "Name and email are required" },
        { status: 400 }
      );
    }

    if (auth.mode === "localdb") {
      // Update in local database
      const businessIndex = auth.db.businesses.findIndex(b => b.id === businessId);
      
      if (businessIndex === -1) {
        return NextResponse.json(
          { detail: "Business not found" },
          { status: 404 }
        );
      }

      // Update the business
      auth.db.businesses[businessIndex] = {
        ...auth.db.businesses[businessIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };

      auth.saveDb(auth.db);

      const { password_hash, ...safeBusiness } = auth.db.businesses[businessIndex];
      return NextResponse.json(safeBusiness);

    } else {
      // Update in Supabase
      const { data: business, error } = await auth.supabase
        .from("businesses")
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
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

      return NextResponse.json(business);
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
      // Delete from local database
      const businessIndex = auth.db.businesses.findIndex(b => b.id === businessId);
      
      if (businessIndex === -1) {
        return NextResponse.json(
          { detail: "Business not found" },
          { status: 404 }
        );
      }

      // Also delete related data (bookings, sessions, etc.)
      auth.db.bookings = auth.db.bookings.filter(booking => booking.businessId !== businessId);
      auth.db.sessions = auth.db.sessions.filter(session => session.businessId !== businessId);
      auth.db.invoiceTemplates = auth.db.invoiceTemplates.filter(template => template.businessId !== businessId);
      auth.db.invoices = auth.db.invoices.filter(invoice => invoice.businessId !== businessId);

      // Delete the business
      auth.db.businesses.splice(businessIndex, 1);
      auth.saveDb(auth.db);

      return NextResponse.json({ detail: "Business deleted successfully" });

    } else {
      // Delete from Supabase - you might want to handle cascading deletes at the database level
      const { error } = await auth.supabase
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

  } catch (error) {
    console.error("Error in admin businesses DELETE:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

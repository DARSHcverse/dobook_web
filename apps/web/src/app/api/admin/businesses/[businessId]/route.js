import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(request, { params }) {
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

    if (hasSupabaseConfig()) {
      // Update in Supabase
      const { data: business, error } = await supabaseAdmin()
        .from("businesses")
        .update({
          business_name: updateData.name,
          email: updateData.email,
          phone: updateData.phone || "",
          business_address: updateData.business_address || "",
          abn: updateData.abn || "",
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
      business.business_name = updateData.name;
      business.email = updateData.email;
      business.phone = updateData.phone || "";
      business.business_address = updateData.business_address || "";
      business.abn = updateData.abn || "";
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

  } catch (error) {
    console.error("Error in admin businesses DELETE:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

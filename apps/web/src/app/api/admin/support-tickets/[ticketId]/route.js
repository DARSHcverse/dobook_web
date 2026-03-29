import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";
import { logAdminActivity } from "@/lib/adminActivity";

export async function PUT(request, { params }) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const { ticketId } = params;
    const body = await request.json().catch(() => ({}));
    const status = String(body?.status || "").trim().toLowerCase();
    const allowed = new Set(["open", "in-progress", "resolved"]);
    if (!allowed.has(status)) {
      return NextResponse.json({ detail: "Invalid status" }, { status: 400 });
    }

    const updates = {
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    };

    const { data: ticket, error } = await supabaseAdmin()
      .from("support_tickets")
      .update(updates)
      .eq("id", ticketId)
      .select("id,business_id,business_email,subject,message,status,created_at,resolved_at")
      .single();

    if (error) {
      return NextResponse.json({ detail: error.message || "Failed to update ticket" }, { status: 500 });
    }

    const action = status === "resolved" ? "support_ticket_resolved" : "support_ticket_status_updated";
    const logResult = await logAdminActivity({
      adminEmail: auth.email,
      action,
      targetBusinessId: ticket?.business_id || null,
      details: { ticket_id: ticketId, status },
    });
    if (!logResult?.ok && logResult?.error) {
      console.error("Failed to log support ticket status update", logResult);
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Error updating support ticket:", error);
    return NextResponse.json({ detail: error?.message || "Failed to update ticket" }, { status: 500 });
  }
}

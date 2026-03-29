import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAuth } from "@/lib/adminAuth";
import { sendEmailViaResend } from "@/lib/email";
import { logAdminActivity } from "@/lib/adminActivity";

function logAdminError(message, error, context) {
  console.error(message, {
    error: {
      message: error?.message || error?.error || error?.detail,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    },
    ...context,
  });
}

async function sendPlanChangeEmail({ business, plan, status }) {
  const email = String(business?.email || "").trim();
  if (!email) return { ok: false, skipped: true, error: "Missing business email" };
  const name = String(business?.business_name || "there").trim() || "there";
  const planLabel = plan === "pro" ? "Pro" : "Free";
  const statusLabel = status ? ` (status: ${status})` : "";
  const subject = `Your DoBook plan is now ${planLabel}`;
  const text = `Hi ${name},\n\nYour DoBook plan has been updated to ${planLabel}${statusLabel}.\n\nIf you have questions, reply to this email.\n\n— DoBook Team`;
  const html = `<p>Hi ${name},</p><p>Your DoBook plan has been updated to <strong>${planLabel}</strong>${statusLabel}.</p><p>If you have questions, reply to this email.</p><p>— DoBook Team</p>`;
  return sendEmailViaResend({ to: email, subject, html, text });
}

export async function PUT(request, { params }) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

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

    const updates = {};
    if (name !== undefined) updates.business_name = name;
    if (email !== undefined) updates.email = email;
    if (updateData.phone !== undefined) updates.phone = updateData.phone || "";
    if (updateData.business_address !== undefined) updates.business_address = updateData.business_address || "";
    if (updateData.abn !== undefined) updates.abn = updateData.abn || "";
    if (updateData.admin_notes !== undefined) updates.admin_notes = String(updateData.admin_notes || "");
    if (subscription_plan !== undefined) updates.subscription_plan = subscription_plan || "free";
    if (subscription_status !== undefined) {
      updates.subscription_status = subscription_status || "inactive";
      updates.subscription_status_changed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ detail: "No updates provided" }, { status: 400 });
    }

    const { data: business, error } = await supabaseAdmin()
      .from("businesses")
      .update(updates)
      .eq("id", businessId)
      .select()
      .single();

    if (error) {
      logAdminError("Error updating business", error, { businessId, updates });
      return NextResponse.json(
        { detail: "Failed to update business" },
        { status: 500 }
      );
    }

    if (subscription_plan === "pro" || subscription_plan === "free") {
      try {
        const emailResult = await sendPlanChangeEmail({
          business,
          plan: subscription_plan,
          status: subscription_status,
        });
        if (!emailResult?.ok) {
          logAdminError("Admin plan change email failed", emailResult, {
            businessId,
            plan: subscription_plan,
            status: subscription_status,
          });
        }
      } catch (mailError) {
        logAdminError("Admin plan change email exception", mailError, {
          businessId,
          plan: subscription_plan,
          status: subscription_status,
        });
      }
    }

    if (subscription_plan === "pro" || subscription_plan === "free") {
      const action = subscription_plan === "pro" ? "grant_pro" : "set_free";
      const logResult = await logAdminActivity({
        adminEmail: auth.email,
        action,
        targetBusinessId: businessId,
        details: {
          subscription_plan,
          subscription_status,
        },
      });
      if (!logResult?.ok && logResult?.error) {
        logAdminError("Failed to log admin activity", logResult, { businessId, action });
      }
    }

    return NextResponse.json({
      ...business,
      message: "Business updated successfully"
    });

  } catch (error) {
    logAdminError("Error in admin businesses PUT", error, { businessId: params?.businessId });
    return NextResponse.json(
      { detail: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

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

    const logResult = await logAdminActivity({
      adminEmail: auth.email,
      action: "delete_business",
      targetBusinessId: businessId,
    });
    if (!logResult?.ok && logResult?.error) {
      logAdminError("Failed to log admin delete action", logResult, { businessId, action: "delete_business" });
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

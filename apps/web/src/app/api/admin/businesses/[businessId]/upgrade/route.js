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

export async function POST(request, { params }) {
  try {
    const auth = requireAdminAuth(request);
    if (auth.error) return auth.error;

    const { businessId } = params;

    const { data: business, error } = await supabaseAdmin()
      .from("businesses")
      .update({
        subscription_plan: "pro",
        subscription_status: "active",
        subscription_status_changed_at: new Date().toISOString(),
      })
      .eq("id", businessId)
      .select()
      .single();

    if (error) {
      logAdminError("Error upgrading business", error, { businessId });
      return NextResponse.json(
        { detail: "Failed to upgrade business" },
        { status: 500 }
      );
    }

    try {
      const emailResult = await sendPlanChangeEmail({ business, plan: "pro", status: "active" });
      if (!emailResult?.ok) {
        logAdminError("Admin plan change email failed", emailResult, { businessId, plan: "pro", status: "active" });
      }
    } catch (mailError) {
      logAdminError("Admin plan change email exception", mailError, { businessId, plan: "pro", status: "active" });
    }

    const logResult = await logAdminActivity({
      adminEmail: auth.email,
      action: "grant_pro",
      targetBusinessId: businessId,
      details: { subscription_plan: "pro", subscription_status: "active" },
    });
    if (!logResult?.ok && logResult?.error) {
      logAdminError("Failed to log admin activity", logResult, { businessId, action: "grant_pro" });
    }

    return NextResponse.json({
      ...business,
      message: "Business upgraded to pro plan successfully"
    });

  } catch (error) {
    logAdminError("Error in admin businesses upgrade", error, { businessId: params?.businessId });
    return NextResponse.json(
      { detail: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function logAdminActivity({ adminEmail, action, targetBusinessId, details }) {
  try {
    if (!adminEmail || !action) return { ok: false, skipped: true, error: "Missing adminEmail or action" };
    const payload = {
      admin_email: String(adminEmail).trim().toLowerCase(),
      action: String(action).trim(),
      target_business_id: targetBusinessId || null,
      details: details || null,
    };
    const { error } = await supabaseAdmin().from("admin_activity_log").insert(payload);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || "Failed to log activity" };
  }
}

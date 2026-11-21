import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readEmailVerifyToken } from "@/lib/emailVerification";

export const runtime = "nodejs";

// Target of the "Confirm my email" link. Always redirects to a page, never
// returns JSON, because a person clicked it from their inbox.
export async function GET(request) {
  const url = new URL(request.url);
  const redirect = (path) => NextResponse.redirect(new URL(path, url.origin), 303);

  const claim = readEmailVerifyToken(url.searchParams.get("token"));
  if (!claim) return redirect("/dashboard?verify=invalid");

  const sb = supabaseAdmin();
  const { data: business, error } = await sb
    .from("businesses")
    .select("*")
    .eq("id", claim.businessId)
    .maybeSingle();

  // The token binds the email too: a link sent before an email change is void.
  if (error || !business || String(business.email || "").trim().toLowerCase() !== claim.email) {
    return redirect("/dashboard?verify=invalid");
  }

  if (!business.email_verified_at) {
    const { error: updateError } = await sb
      .from("businesses")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", business.id);
    if (updateError) {
      console.error("[verify-email] update failed:", updateError.message);
      return redirect("/dashboard?verify=error");
    }
  }

  return redirect("/dashboard?verify=ok");
}

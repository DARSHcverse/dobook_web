import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/app/api/_utils/rateLimit";
import { fetchPageText, generateSitePreview } from "@/lib/sitePreview";
import { applyAiOnboardingConfig } from "@/lib/businessTypeSeeder";
import { getBusinessTypeTemplate } from "@/lib/businessTypeTemplates";

export const runtime = "nodejs";
export const maxDuration = 60;

// Applies an Instant-Setup preview to the logged-in business: sets business
// type + services, plus a public profile (bio, brand color, services list).
// Called by the dashboard when a freshly-signed-up user arrived with ?setup_from.
export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  if (auth.mode !== "supabase") {
    return NextResponse.json({ detail: "Instant setup requires the hosted database." }, { status: 400 });
  }

  const limited = await rateLimit({
    request,
    keyPrefix: `instant-setup:${auth.business.id}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many attempts. Try again later." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const body = await request.json().catch(() => ({}));
  let url = String(body?.url || "").trim();
  if (!url) return NextResponse.json({ detail: "Missing url" }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  let pageText;
  try {
    pageText = await fetchPageText(url);
  } catch {
    return NextResponse.json({ detail: "We couldn't read that page." }, { status: 422 });
  }
  if (!pageText || pageText.length < 40) {
    return NextResponse.json({ detail: "Not enough content on that page." }, { status: 422 });
  }

  let preview;
  try {
    preview = await generateSitePreview(pageText);
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ detail: "Setup is temporarily unavailable." }, { status: 503 });
    }
    return NextResponse.json({ detail: "We couldn't build your setup." }, { status: 502 });
  }
  if (!preview) {
    return NextResponse.json({ detail: "We couldn't understand that page." }, { status: 422 });
  }

  const sb = auth.supabase;
  const businessId = auth.business.id;

  // 1. Apply business type + AI services, plus the type template's default
  //    booking fields and add-ons so the account is fully usable out of the box.
  const template = getBusinessTypeTemplate(preview.business_type) || {};
  const applyResult = await applyAiOnboardingConfig({
    sb,
    businessId,
    config: {
      business_type: preview.business_type,
      services: preview.services.map((s) => s.name),
      booking_fields: Array.isArray(template.booking_fields) ? template.booking_fields : [],
      addons: Array.isArray(template.addons) ? template.addons : [],
    },
  });
  if (!applyResult?.ok) {
    return NextResponse.json({ detail: applyResult?.detail || "Failed to apply setup" }, { status: 400 });
  }

  // 2. Set a public profile (bio, brand color, services with prices).
  const publicServices = preview.services.map((s) => ({
    name: s.name,
    price: s.price || 0,
    duration_minutes: s.duration_minutes || null,
  }));

  const profileUpdates = {
    public_services: publicServices,
  };
  if (preview.bio) profileUpdates.public_description = preview.bio;
  if (preview.brand_color) profileUpdates.brand_color = preview.brand_color;
  // Only set the business name if the account is still on a placeholder-ish name.
  if (preview.business_name && !String(auth.business.business_name || "").trim()) {
    profileUpdates.business_name = preview.business_name;
  }

  const { error: profErr } = await sb.from("businesses").update(profileUpdates).eq("id", businessId);
  if (profErr) {
    console.error("[instant-setup] profile update failed:", profErr.message);
    // Non-fatal: the type/services were applied. Report partial success.
    return NextResponse.json({
      ok: true,
      partial: true,
      applied: applyResult,
      detail: "Services set up, but profile details couldn't be saved.",
    });
  }

  return NextResponse.json({
    ok: true,
    applied: applyResult,
    preview: {
      business_type: preview.business_type,
      business_type_label: preview.business_type_label,
      services_count: preview.services.length,
    },
  });
}

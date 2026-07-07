import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/app/api/_utils/rateLimit";
import { generateOnboardingConfig } from "@/lib/aiOnboarding";
import { applyAiOnboardingConfig } from "@/lib/businessTypeSeeder";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  if (auth.mode !== "supabase") {
    return NextResponse.json({ detail: "AI onboarding requires the hosted database." }, { status: 400 });
  }

  // AI calls cost money — cap them per business/IP.
  const limited = await rateLimit({
    request,
    keyPrefix: `ai-onboarding:${auth.business.id}`,
    limit: 15,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many requests. Try again later." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "preview").trim().toLowerCase();

  // Apply a previously-previewed (and possibly edited) config.
  if (action === "apply") {
    const config = body?.config;
    if (!config || typeof config !== "object") {
      return NextResponse.json({ detail: "config is required to apply" }, { status: 400 });
    }
    const result = await applyAiOnboardingConfig({
      sb: auth.supabase,
      businessId: auth.business.id,
      config,
    });
    if (!result?.ok) {
      return NextResponse.json({ detail: result?.detail || "Failed to apply config" }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  // Default: generate a config preview from the free-text description.
  const description = String(body?.description || "").trim();
  if (description.length < 10) {
    return NextResponse.json(
      { detail: "Please describe your business in a bit more detail (at least 10 characters)." },
      { status: 400 },
    );
  }

  let config;
  try {
    config = await generateOnboardingConfig(description);
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ detail: "AI is not configured on this server." }, { status: 503 });
    }
    return NextResponse.json({ detail: "AI could not generate a setup. Please try again." }, { status: 502 });
  }

  if (!config) {
    return NextResponse.json({ detail: "Could not understand that description. Try rephrasing." }, { status: 422 });
  }

  return NextResponse.json({ ok: true, config });
}

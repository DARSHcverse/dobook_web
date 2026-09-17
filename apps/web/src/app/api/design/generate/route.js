import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/app/api/_utils/rateLimit";
import { hasProAccess } from "@/lib/entitlements";
import { generateDesignSpec } from "@/lib/design/aiDesign";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  // Design Studio is a Pro feature; the UI gates the button, but the route must
  // enforce it too — a client-side check is not an authorization boundary.
  if (!hasProAccess(auth.business)) {
    return NextResponse.json(
      { detail: "Design Studio is available on the Pro plan." },
      { status: 403 },
    );
  }

  // Each generation is a paid model call, so cap it per business.
  const limited = await rateLimit({
    request,
    keyPrefix: `design-generate:${auth.business.id}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json(
      { detail: "Too many design generations. Try again shortly." },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const body = await request.json().catch(() => ({}));
  const description = String(body?.description || "").trim().slice(0, 500);
  if (description.length < 6) {
    return NextResponse.json(
      { detail: "Describe the design you want in a few more words." },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await generateDesignSpec({
      description,
      eventType: String(body?.event_type || "").trim().slice(0, 80),
      businessName: String(auth.business?.business_name || "").trim().slice(0, 80),
    });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ detail: "AI is not configured on this server." }, { status: 503 });
    }
    console.error("[design/generate] error:", msg);
    return NextResponse.json(
      { detail: "Could not generate a design. Please try again." },
      { status: 502 },
    );
  }

  if (!result) {
    return NextResponse.json(
      { detail: "Could not turn that into a design. Try describing colours and style." },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true, ...result });
}

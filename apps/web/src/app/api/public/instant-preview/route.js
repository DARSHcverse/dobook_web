import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/app/api/_utils/rateLimit";
import { fetchPageText, generateSitePreview } from "@/lib/sitePreview";
import { BUSINESS_TYPES } from "@/lib/businessTypeTemplates";

export const runtime = "nodejs";
export const maxDuration = 60;

// Block obvious SSRF targets: localhost, private ranges, cloud metadata.
function isBlockedHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "169.254.169.254" || h === "metadata.google.internal") return true;
  // IPv4 private / loopback / link-local ranges
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h === "0.0.0.0" || h === "::1" || h.startsWith("[")) return true;
  return false;
}

function typeLabel(id) {
  return BUSINESS_TYPES.find((t) => t.id === id)?.label || id;
}

export async function POST(request) {
  // Public + costs money + does outbound fetch → strict IP rate limit.
  const limited = await rateLimit({
    request,
    keyPrefix: "instant-preview",
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many previews. Please try again later." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const body = await request.json().catch(() => ({}));
  let url = String(body?.url || "").trim();
  if (!url) return NextResponse.json({ detail: "Enter your website or social link." }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ detail: "That doesn't look like a valid link." }, { status: 400 });
  }
  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ detail: "That link can't be used." }, { status: 400 });
  }

  let pageText;
  try {
    pageText = await fetchPageText(url);
  } catch {
    return NextResponse.json(
      { detail: "We couldn't read that page. Try your main website URL, or you can set things up manually after signing up." },
      { status: 422 },
    );
  }

  if (!pageText || pageText.length < 40) {
    return NextResponse.json(
      { detail: "There wasn't enough on that page to read. Try a different link." },
      { status: 422 },
    );
  }

  let preview;
  try {
    preview = await generateSitePreview(pageText);
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ detail: "Preview is temporarily unavailable." }, { status: 503 });
    }
    return NextResponse.json({ detail: "We couldn't build a preview. Please try again." }, { status: 502 });
  }

  if (!preview) {
    return NextResponse.json({ detail: "We couldn't understand that page. Try a different link." }, { status: 422 });
  }

  console.log(`[instant-preview] ok ip=${getClientIp(request)} host=${parsed.hostname} type=${preview.business_type}`);

  return NextResponse.json({
    ok: true,
    source_url: url,
    preview: { ...preview, business_type_label: typeLabel(preview.business_type) },
  });
}

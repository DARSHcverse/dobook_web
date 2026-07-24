import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/app/api/_utils/rateLimit";
import { generateEnquiryReply } from "@/lib/enquiryReply";

export const runtime = "nodejs";
export const maxDuration = 30;

// Drafts an AI reply (message + suggested price) for a specific enquiry.
// The owner reviews/edits before sending — this never sends anything itself.
export async function POST(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const bookingId = params?.bookingId;
  if (!bookingId) return NextResponse.json({ detail: "bookingId required" }, { status: 400 });

  const limited = await rateLimit({
    request,
    keyPrefix: `ai-draft:${auth.business.id}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many drafts. Try again shortly." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const sb = auth.supabase;
  const { data: enquiry, error } = await sb
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("business_id", auth.business.id)
    .eq("is_enquiry", true)
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!enquiry) return NextResponse.json({ detail: "Enquiry not found" }, { status: 404 });

  const currency = auth.business.currency || "aud";

  let draft;
  try {
    draft = await generateEnquiryReply({ enquiry, business: auth.business, currency });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ detail: "AI drafting is not configured." }, { status: 503 });
    }
    return NextResponse.json({ detail: "Couldn't draft a reply. Please try again." }, { status: 502 });
  }

  if (!draft) {
    return NextResponse.json({ detail: "Couldn't draft a reply. Please write one manually." }, { status: 422 });
  }

  return NextResponse.json({ ok: true, draft });
}

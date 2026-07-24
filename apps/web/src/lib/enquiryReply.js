import "server-only";
import { formatMoney } from "@/lib/money";

// Haiku drafts personalized enquiry replies — cheap, fast, tone-appropriate.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") out[k] = v;
  }
  return out;
}

function buildPrompt({ enquiry, business, currency }) {
  const biz = pick(business, ["business_name", "business_type", "industry"]);
  const enq = pick(enquiry, [
    "customer_name",
    "event_type",
    "booking_date",
    "booking_time",
    "event_location",
    "num_guests",
    "package_name",
    "category_name",
    "duration_minutes",
    "enquiry_message",
    "notes",
  ]);
  const suggested =
    enquiry?.quoted_price || enquiry?.price || enquiry?.total_amount || null;
  const priceHint = suggested
    ? `A rough price on file is ${formatMoney(suggested, currency)}. Use it as a starting point unless the details suggest otherwise.`
    : "No price is on file; suggest a sensible quote based on the details, or 0 if you truly cannot.";

  return `You are the owner of "${biz.business_name || "a service business"}" replying to a customer enquiry. Write a warm, professional, concise reply that moves toward a booking.

Business context: ${JSON.stringify(biz)}
Enquiry details: ${JSON.stringify(enq)}
${priceHint}

Return ONLY valid JSON, no markdown fences:
{
  "suggested_price": 0,
  "message": "the reply text"
}

Rules:
- Address the customer by first name if available.
- Reference specifics from their enquiry (date, event type, guests, package) so it feels personal, not templated.
- Keep it 3-5 short sentences. Friendly, confident, no fluff.
- End with a clear next step (confirm to book / reply with questions).
- suggested_price is a number in the business currency (0 if unknown). Do NOT include currency symbols.
- Do NOT invent facts (exact availability, discounts) not implied by the details.
- Sign off as the business name, not a personal name.`;
}

export async function generateEnquiryReply({ enquiry, business, currency = "aud" }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: buildPrompt({ enquiry, business, currency }) }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = Array.isArray(data?.content) ? data.content.map((b) => b?.text || "").join("") : "";
  return parseReply(text);
}

export function parseReply(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);

  let raw;
  try {
    raw = JSON.parse(s);
  } catch {
    // If the model returned prose instead of JSON, use it as the message.
    const msg = String(text).trim();
    return msg ? { suggested_price: 0, message: msg.slice(0, 2000) } : null;
  }

  const price = Number(raw?.suggested_price);
  const message = String(raw?.message || "").trim();
  if (!message) return null;
  return {
    suggested_price: Number.isFinite(price) && price >= 0 ? price : 0,
    message: message.slice(0, 2000),
  };
}

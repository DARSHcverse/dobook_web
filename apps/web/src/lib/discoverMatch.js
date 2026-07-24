import "server-only";
import { BUSINESS_TYPES } from "@/lib/businessTypeTemplates";

// One cheap Haiku call turns a natural-language need into structured search
// intent. We then rank businesses in code — so cost is O(1) in business count.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const VALID_TYPE_IDS = new Set(BUSINESS_TYPES.map((t) => t.id));

function buildPrompt(query) {
  const typeList = BUSINESS_TYPES.map((t) => `- ${t.id}: ${t.label}`).join("\n");
  return `A person is searching a local services marketplace. Interpret their request into structured search intent.

Business types:
${typeList}

Return ONLY valid JSON, no markdown fences:
{
  "business_types": ["ids that fit, most relevant first"],
  "keywords": ["specific need words to match, e.g. wedding, balayage, mobile"],
  "max_budget": 0,
  "location_hint": "any place/postcode mentioned, else empty",
  "intent_summary": "one short sentence restating what they want"
}

Rules:
- business_types: 1-3 ids from the list. If ambiguous, include the closest matches.
- keywords: 2-6 lowercase words/phrases from the request that a listing might contain. No stopwords.
- max_budget: a number if a price/budget is mentioned, else 0.
- Keep it strictly to what's asked; do not invent constraints.

Search request:
${String(query || "").slice(0, 500)}`;
}

export async function interpretSearch(query) {
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
      max_tokens: 400,
      messages: [{ role: "user", content: buildPrompt(query) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);

  const data = await res.json();
  const text = Array.isArray(data?.content) ? data.content.map((b) => b?.text || "").join("") : "";
  return parseIntent(text);
}

export function parseIntent(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  let raw;
  try {
    raw = JSON.parse(s);
  } catch {
    return null;
  }
  const business_types = (Array.isArray(raw?.business_types) ? raw.business_types : [])
    .map((t) => String(t || "").trim())
    .filter((t) => VALID_TYPE_IDS.has(t))
    .slice(0, 3);
  const keywords = (Array.isArray(raw?.keywords) ? raw.keywords : [])
    .map((k) => String(k || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  const budget = Number(raw?.max_budget);
  return {
    business_types,
    keywords,
    max_budget: Number.isFinite(budget) && budget > 0 ? budget : 0,
    location_hint: String(raw?.location_hint || "").trim().slice(0, 60),
    intent_summary: String(raw?.intent_summary || "").trim().slice(0, 160),
  };
}

// Rank businesses against interpreted intent. Pure function, no AI cost.
export function rankBusinesses(businesses, intent) {
  const types = new Set(intent?.business_types || []);
  const keywords = intent?.keywords || [];
  const budget = intent?.max_budget || 0;

  const scored = (businesses || []).map((b) => {
    let score = 0;
    const reasons = [];

    // Business-type match is the strongest signal.
    const bt = String(b.business_type || "").trim();
    if (bt && types.has(bt)) {
      // Earlier in the intent list = more relevant.
      const rank = (intent.business_types || []).indexOf(bt);
      score += 50 - rank * 5;
      reasons.push("service type match");
    }

    const hay = [
      b.business_name,
      b.public_description,
      b.industry,
      ...(Array.isArray(b.booth_types) ? b.booth_types : []),
      ...(Array.isArray(b.public_services) ? b.public_services.map((s) => (typeof s === "string" ? s : s?.name)) : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let kwHits = 0;
    for (const kw of keywords) {
      if (kw && hay.includes(kw)) {
        kwHits += 1;
        score += 10;
      }
    }
    if (kwHits) reasons.push(`${kwHits} keyword${kwHits > 1 ? "s" : ""} matched`);

    // Budget: reward listings with any service at/under budget.
    if (budget > 0 && Array.isArray(b.public_services)) {
      const prices = b.public_services
        .map((s) => Number(s?.price))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (prices.length && Math.min(...prices) <= budget) {
        score += 8;
        reasons.push("fits your budget");
      }
    }

    return { ...b, _score: score, _reasons: reasons };
  });

  return scored
    .filter((b) => b._score > 0)
    .sort((a, b) => b._score - a._score);
}

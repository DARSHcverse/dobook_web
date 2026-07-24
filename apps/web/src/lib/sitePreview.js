import "server-only";
import { BUSINESS_TYPES, normalizeBusinessType } from "@/lib/businessTypeTemplates";
import { stripHtmlToText } from "@/lib/packageExtractor";

// Haiku is cheap + fast — ideal for the pre-signup "instant preview" that scrapes
// a site and drafts a full booking setup in one call.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const HEX = /^#?[0-9a-fA-F]{6}$/;

export async function fetchPageText(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("invalid_url");
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("invalid_protocol");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DoBookImporter/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http_${res.status}`);
    const html = await res.text();
    return stripHtmlToText(html);
  } catch (e) {
    clearTimeout(timer);
    throw new Error("fetch_failed");
  }
}

function buildPrompt(pageText) {
  const trimmed = String(pageText || "").slice(0, 18000);
  const typeList = BUSINESS_TYPES.map((t) => `- ${t.id}: ${t.label}`).join("\n");

  return `You are setting up a booking page for a business, based on the text scraped from their website or social page. Infer a complete, realistic setup.

Choose business_type from exactly one of:
${typeList}

Return ONLY valid JSON, no markdown fences:
{
  "business_name": "the business name if found, else empty string",
  "business_type": "one id from the list",
  "tagline": "one short compelling line describing what they do",
  "bio": "2-3 sentence professional description for their public booking profile",
  "brand_color": "a hex color that fits their brand if inferable (e.g. #1E88E5), else empty string",
  "services": [
    { "name": "Service name", "price": 0, "duration_minutes": 60 }
  ]
}

Rules:
- business_type MUST be one id from the list; pick the closest.
- services: 3-8 real services with realistic prices (number, 0 if truly unknown) and duration in minutes.
- brand_color: only if you can reasonably infer it; empty string otherwise. Must be a hex like #RRGGBB.
- Keep bio/tagline concise, professional, and specific to this business.
- If the text is too sparse to tell, still produce a sensible starter setup for the closest business_type.

Scraped content:
${trimmed}`;
}

export async function generateSitePreview(pageText) {
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
      max_tokens: 1500,
      messages: [{ role: "user", content: buildPrompt(pageText) }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = Array.isArray(data?.content) ? data.content.map((b) => b?.text || "").join("") : "";
  return normalizePreview(text);
}

export function normalizePreview(text) {
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

  const business_type = normalizeBusinessType(raw?.business_type);
  if (!business_type) return null;

  const services = (Array.isArray(raw?.services) ? raw.services : [])
    .map((sv) => {
      const name = String(sv?.name || "").trim();
      if (!name) return null;
      const price = Number(sv?.price);
      const dur = Number(sv?.duration_minutes);
      return {
        name: name.slice(0, 80),
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        duration_minutes: Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 60,
      };
    })
    .filter(Boolean)
    .slice(0, 8);

  const rawColor = String(raw?.brand_color || "").trim();
  const brand_color = HEX.test(rawColor) ? (rawColor.startsWith("#") ? rawColor : `#${rawColor}`) : "";

  return {
    business_name: String(raw?.business_name || "").trim().slice(0, 120),
    business_type,
    tagline: String(raw?.tagline || "").trim().slice(0, 160),
    bio: String(raw?.bio || "").trim().slice(0, 600),
    brand_color,
    services,
  };
}

import "server-only";

const ANTHROPIC_MODEL = "claude-opus-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export function stripHtmlToText(html) {
  if (!html) return "";
  let s = String(html);
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/&amp;/gi, "&");
  s = s.replace(/&lt;/gi, "<");
  s = s.replace(/&gt;/gi, ">");
  s = s.replace(/&quot;/gi, '"');
  s = s.replace(/&#39;/gi, "'");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function buildPrompt(pageContent) {
  const trimmed = String(pageContent || "").slice(0, 24000);
  return `Extract all packages/pricing from this website content. Return ONLY valid JSON, no other text, no markdown code fences.

Format:
{
  "categories": [
    {
      "name": "Category name e.g. Open Booth",
      "packages": [
        {
          "name": "Package name e.g. 3 Hours",
          "price": 550,
          "duration_hours": 3,
          "features": ["Unlimited Photos", "Instant Prints"]
        }
      ]
    }
  ]
}

Rules:
- If there are no categories/booth types, create a single category named "Packages".
- price must be a number in the business's currency (strip currency symbols).
- duration_hours must be a number; infer from "3hr", "3 hours", etc. Use 0 if unknown.
- features is an array of short strings. Omit empty features.
- If no packages are found, return { "categories": [] }.

Website content:
${trimmed}`;
}

export async function callAnthropicExtract(pageContent) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: buildPrompt(pageContent) }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = Array.isArray(data?.content)
    ? data.content.map((b) => b?.text || "").join("")
    : "";

  return parseExtractedJson(text);
}

export function parseExtractedJson(text) {
  if (!text) return { categories: [] };
  let s = String(text).trim();
  // Strip markdown fences if present
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  // Extract first JSON object in string
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  try {
    const parsed = JSON.parse(s);
    return normalizeExtracted(parsed);
  } catch {
    return { categories: [] };
  }
}

function normalizeExtracted(raw) {
  const cats = Array.isArray(raw?.categories) ? raw.categories : [];
  const categories = cats
    .map((c) => {
      const name = String(c?.name || "").trim();
      const packages = Array.isArray(c?.packages) ? c.packages : [];
      const normPkgs = packages
        .map((p) => {
          const pname = String(p?.name || "").trim();
          const price = Number(p?.price);
          const duration = Number(p?.duration_hours);
          const features = Array.isArray(p?.features)
            ? p.features.map((f) => String(f || "").trim()).filter(Boolean)
            : [];
          if (!pname) return null;
          return {
            name: pname,
            price: Number.isFinite(price) ? price : 0,
            duration_hours: Number.isFinite(duration) ? duration : 0,
            features,
          };
        })
        .filter(Boolean);
      return name ? { name, packages: normPkgs } : null;
    })
    .filter(Boolean);
  return { categories };
}

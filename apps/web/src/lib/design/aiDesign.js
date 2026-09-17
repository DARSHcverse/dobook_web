import "server-only";
import { FONT_KEYS, PRINT_FORMAT_IDS, DEFAULT_FORMAT_ID, normalizeDesignSpec } from "./specs";

// Claude as art director, not image generator.
//
// The Anthropic Messages API returns text, not images — so the model does not
// draw the strip. It returns a *design specification* (palette, typography,
// layout, wording) which lib/design/render.js then draws deterministically.
//
// For photo booth overlays this is the better trade anyway: a generated raster
// cannot guarantee an exact 600x1800 canvas with transparent photo slots in the
// right places, and an overlay that misses those constraints is unusable in
// Darkroom or LumaBooth. A spec always renders print-correct.

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// The model is told to emit tokens rather than literal names, so one generated
// design stays reusable across every booking instead of being hardcoded to one.
const SYSTEM_PROMPT = `You are a senior print designer specialising in photo booth strip overlays.

Return ONLY a JSON object — no prose, no markdown fences.

Schema:
{
  "name": "short design name (2-4 words)",
  "format": one of ${PRINT_FORMAT_IDS.map((f) => `"${f}"`).join(", ")},
  "background": { "type": "solid"|"gradient", "color": "#rrggbb", "colorTo": "#rrggbb", "angle": 0-360 },
  "border": { "enabled": true|false, "color": "#rrggbb", "width": 0.004-0.02, "inset": 0.01-0.04 },
  "slotStyle": { "radius": 0-1, "borderColor": "#rrggbb", "borderWidth": 0-0.01 },
  "text": [
    { "content": "...", "x": 0-1, "y": 0-1, "size": 0.012-0.06, "color": "#rrggbb",
      "font": one of ${FONT_KEYS.map((f) => `"${f}"`).join(", ")},
      "align": "left"|"center"|"right", "weight": "normal"|"bold",
      "letterSpacing": 0-0.02, "uppercase": true|false }
  ]
}

Hard rules:
- Coordinates and sizes are FRACTIONS of the canvas (0-1), never pixels.
- Text must sit in the footer area BELOW the photos: y between 0.80 and 0.97.
  Anything above 0.78 would be covered by the guest's photos.
- Use these template tokens in "content" instead of inventing names or dates:
  {{customer_name}}, {{event_date}}, {{event_type}}, {{venue}},
  {{business_name}}, {{initials}}
- 2 to 4 text items. Order them top to bottom with increasing y and no overlap
  (leave at least 0.045 between consecutive y values).
- Ensure strong contrast between every text colour and the background.
- Prefer a large name/initials line, a smaller date line, and a small business
  credit line at the bottom.`;

function buildUserPrompt({ description, eventType, businessName }) {
  const context = [
    eventType ? `Event type: ${eventType}` : "",
    businessName ? `Photo booth business: ${businessName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${context ? `${context}\n\n` : ""}Design brief: ${description}`;
}

// Claude occasionally wraps JSON in prose or fences despite instructions; pull
// out the outermost object before parsing.
export function parseDesignJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Keeps generated text clear of the photo slots and stops two lines landing on
// top of each other. The model is asked for this, but a design that ignored it
// would render text across a guest's face — so it is enforced, not trusted.
function enforceFooterLayout(spec) {
  const MIN_Y = 0.8;
  const MAX_Y = 0.97;
  const GAP = 0.045;

  const items = [...spec.text].sort((a, b) => a.y - b.y);
  let previous = -Infinity;

  for (const item of items) {
    let y = Math.min(MAX_Y, Math.max(MIN_Y, item.y));
    if (y - previous < GAP) y = previous + GAP;
    item.y = Math.min(MAX_Y, y);
    previous = item.y;
  }

  // If crowding pushed items past the bottom edge, distribute them evenly.
  if (items.length && items[items.length - 1].y >= MAX_Y && items.length > 1) {
    const span = MAX_Y - MIN_Y;
    items.forEach((item, i) => {
      item.y = MIN_Y + (span * i) / (items.length - 1);
    });
  }

  return { ...spec, text: items };
}

export async function generateDesignSpec({ description, eventType, businessName } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
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
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildUserPrompt({ description, eventType, businessName }) },
      ],
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

  const raw = parseDesignJson(text);
  if (!raw) return null;

  // normalizeDesignSpec clamps every value and drops anything unrecognised, so
  // a malformed or hostile response can never reach the renderer.
  const spec = normalizeDesignSpec({
    ...raw,
    format: PRINT_FORMAT_IDS.includes(raw?.format) ? raw.format : DEFAULT_FORMAT_ID,
  });

  if (!spec.text.length) return null;

  return {
    name: String(raw?.name || "AI design").trim().slice(0, 60) || "AI design",
    spec: enforceFooterLayout(spec),
  };
}

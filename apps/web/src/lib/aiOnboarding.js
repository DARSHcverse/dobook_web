import "server-only";
import { BUSINESS_TYPES, normalizeBusinessType } from "@/lib/businessTypeTemplates";

// Claude Haiku is cheap + fast, ideal for a short classification + generation
// task like onboarding. Keep this model ID current.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const VALID_FIELD_TYPES = new Set(["text", "textarea", "select", "tel", "email", "date", "number", "file"]);

function slugKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

// Per-category hints steer the model toward the kinds of fields/add-ons that
// actually matter for each business type (and which fields should be private).
const TYPE_HINTS = {
  salon_barbershop: "Fields: staff preference, service type. Add-ons: toner, treatment, styling.",
  medical_wellness: "Fields: reason for visit, referral. Mark health details is_private:true. Add-ons: telehealth, extended session.",
  consultant: "Fields: company, topic/goal, meeting format (video/phone/in-person). Add-ons: recording, follow-up report.",
  tutoring_education: "Fields: subject, student level, guardian name (if minor). Add-ons: materials, recording.",
  home_services_trades: "Fields: job address, access instructions, photo upload (type:file). Add-ons: materials, after-hours, priority.",
  cleaning_services: "Fields: property type (select), bedrooms/bathrooms (number), access instructions. Add-ons: oven, windows, carpet, fridge.",
  fitness_training: "Fields: fitness goal (select), experience level. Mark health notes is_private:true. Add-ons: nutrition plan, extra time.",
  pet_services: "Fields: pet type (select), breed, size (select), temperament. Add-ons: de-shedding, nail trim, teeth cleaning.",
  events_photography: "Fields: event type (select), venue, guest count (number). Add-ons: extra hour, second shooter, album, rush edit.",
  automotive: "Fields: vehicle make/model, rego, year (number), drop-off vs mobile (select). Add-ons: wheel alignment, loan car.",
  beauty_spa: "Fields: treatment preference, preferred therapist. Mark allergies/health notes is_private:true. Add-ons: hot stones, extended session.",
  legal_advisory: "Fields: company, matter type, meeting format (select). Mark confidential notes is_private:true. Add-ons: written summary, extra time.",
};

function buildPrompt(description) {
  const trimmed = String(description || "").slice(0, 2000);
  const typeList = BUSINESS_TYPES.map((t) => {
    const hint = TYPE_HINTS[t.id] ? ` [${TYPE_HINTS[t.id]}]` : "";
    return `- ${t.id}: ${t.label} — ${t.description}${hint}`;
  }).join("\n");

  return `You are setting up a booking system for a business. Based on the owner's description, choose the best matching business_type and generate a tailored booking configuration.

Available business_type values (choose exactly one). The [bracketed] notes suggest typical fields and add-ons for that type — use them as guidance, but always adapt to the specific business described:
${typeList}

Return ONLY valid JSON, no markdown fences, no other text, in this exact shape:
{
  "business_type": "one of the ids above",
  "reasoning": "one short sentence on why this type fits",
  "services": ["Service A", "Service B"],
  "addons": [{ "name": "Add-on name", "price": 0, "duration_extra_mins": 0 }],
  "booking_fields": [{ "name": "Field label", "type": "text", "required": false, "is_private": false, "options": ["A", "B"] }]
}

Rules:
- business_type MUST be one of the ids listed above. If unsure, pick the closest.
- services: 3-6 short service names the business likely offers.
- addons: 2-4 optional extras. price is a number (0 if unknown). duration_extra_mins is a number (0 if none).
- booking_fields: 2-5 EXTRA fields to collect from customers (do NOT include name, email, phone, date, or time — those are always collected). type must be one of: text, textarea, select, number, date, file.
- For "select" fields, include an "options" array of choices; omit "options" for other types.
- Set "is_private": true for sensitive fields (health, medical, allergies, confidential/legal notes) so they stay hidden from customer-facing views. Default false.
- Keep everything concise and realistic for this specific business.

Business description:
${trimmed}`;
}

export async function generateOnboardingConfig(description) {
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
      max_tokens: 1500,
      messages: [{ role: "user", content: buildPrompt(description) }],
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

  return parseOnboardingJson(text);
}

export function parseOnboardingJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  try {
    return normalizeOnboarding(JSON.parse(s));
  } catch {
    return null;
  }
}

function normalizeOnboarding(raw) {
  const business_type = normalizeBusinessType(raw?.business_type);
  if (!business_type) return null;

  const services = (Array.isArray(raw?.services) ? raw.services : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 8);

  const addons = (Array.isArray(raw?.addons) ? raw.addons : [])
    .map((a, i) => {
      const name = String(a?.name || "").trim();
      if (!name) return null;
      const price = Number(a?.price);
      const dur = Number(a?.duration_extra_mins);
      return {
        name: name.slice(0, 80),
        description: String(a?.description || "").trim().slice(0, 200),
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        duration_extra_mins: Number.isFinite(dur) && dur >= 0 ? Math.floor(dur) : 0,
        is_active: true,
        sort_order: i * 10,
      };
    })
    .filter(Boolean)
    .slice(0, 6);

  const RESERVED = new Set(["customer_name", "customer_email", "customer_phone", "booking_date", "booking_time"]);
  const seen = new Set();
  const booking_fields = (Array.isArray(raw?.booking_fields) ? raw.booking_fields : [])
    .map((f, i) => {
      const field_name = String(f?.name || "").trim();
      if (!field_name) return null;
      const field_key = slugKey(field_name);
      if (!field_key || RESERVED.has(field_key) || seen.has(field_key)) return null;
      seen.add(field_key);
      const rawType = String(f?.type || "text").trim().toLowerCase();
      const field_type = VALID_FIELD_TYPES.has(rawType) ? rawType : "text";
      return {
        field_key,
        field_name: field_name.slice(0, 80),
        field_type,
        required: Boolean(f?.required),
        is_private: Boolean(f?.is_private),
        sort_order: i * 10,
        field_options: Array.isArray(f?.options)
          ? f.options.map((o) => String(o || "").trim()).filter(Boolean).slice(0, 20)
          : [],
      };
    })
    .filter(Boolean)
    .slice(0, 8);

  return {
    business_type,
    reasoning: String(raw?.reasoning || "").trim().slice(0, 200),
    services,
    addons,
    booking_fields,
  };
}

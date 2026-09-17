// Resolves {{tokens}} in a design spec against a real booking.
//
// This is the part a standalone design tool structurally cannot do: the design
// is bound to the booking, so "Sarah & James · 14 June 2026" is filled in from
// the record rather than retyped (and mistyped) for every event.

import { DESIGN_TOKEN_KEYS } from "./specs";

function cleanName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

// "Sarah & James Miller" -> "S & J" ; "Sarah Miller" -> "SM"
export function deriveInitials(name) {
  const n = cleanName(name);
  if (!n) return "";

  // Couples are the common case for weddings and engagements.
  const parts = n.split(/\s*(?:&|\+|\band\b)\s*/i).filter(Boolean);
  if (parts.length > 1) {
    return parts
      .map((p) => (p.trim()[0] || "").toUpperCase())
      .filter(Boolean)
      .join(" & ");
  }

  const words = n.split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => (w[0] || "").toUpperCase())
    .join("");
}

// Formats to "14 June 2026". Booking dates are stored as YYYY-MM-DD, so they are
// parsed as plain calendar parts — using Date() on a bare date string shifts by
// timezone and can print the previous day.
export function formatEventDate(value) {
  const s = String(value || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;

  const [, y, mo, d] = m;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = months[Number(mo) - 1];
  if (!monthName) return s;
  return `${Number(d)} ${monthName} ${y}`;
}

export function buildTokenValues({ booking, business } = {}) {
  const customerName = cleanName(booking?.customer_name);
  return {
    "{{customer_name}}": customerName,
    "{{event_date}}": formatEventDate(booking?.booking_date),
    "{{event_type}}": cleanName(booking?.event_type),
    "{{venue}}": cleanName(booking?.event_location || booking?.custom_fields?.venue_name),
    "{{business_name}}": cleanName(business?.business_name),
    "{{initials}}": deriveInitials(customerName),
  };
}

export function applyTokens(text, values) {
  let out = String(text ?? "");
  for (const key of DESIGN_TOKEN_KEYS) {
    if (!out.includes(key)) continue;
    out = out.split(key).join(values?.[key] ?? "");
  }
  // Collapse the whitespace left behind by tokens that resolved to nothing,
  // so a missing venue does not leave a dangling separator or double space.
  return out.replace(/\s{2,}/g, " ").replace(/\s+([·•,])/g, "$1").trim();
}

// Returns a copy of the spec with every text item resolved. Text that resolves
// to nothing is dropped so the design never renders a stray separator.
export function resolveSpecTokens(spec, { booking, business } = {}) {
  const values = buildTokenValues({ booking, business });
  const text = (Array.isArray(spec?.text) ? spec.text : [])
    .map((t) => ({ ...t, content: applyTokens(t.content, values) }))
    .filter((t) => t.content);
  return { ...spec, text };
}

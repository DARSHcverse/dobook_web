// Business brand colour for customer-facing pages (booking page, picker).
// The pages are styled with Tailwind's rose palette; inside a [data-brand]
// scope this stylesheet remaps those utilities to the business's colour, with
// tints via color-mix(). Browsers without color-mix ignore those declarations
// and keep the default rose, so nothing breaks.

export const DEFAULT_BRAND = "#E8193C";

export function sanitizeHex(value) {
  const v = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : DEFAULT_BRAND;
}

// White or black text on the brand colour (WCAG relative luminance).
export function contrastText(hex) {
  const c = sanitizeHex(hex).slice(1);
  const lin = (i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  const onWhite = 1.05 / (L + 0.05);
  const onBlack = (L + 0.05) / 0.05;
  // Prefer white (how brands normally style buttons) while it meets the WCAG
  // 3:1 minimum for bold UI text; switch to near-black for light brand
  // colours (yellows, pastels) where white would be unreadable.
  return onWhite >= 3 || onWhite >= onBlack ? "#FFFFFF" : "#18181B";
}

export function brandStyleVars(hex) {
  const brand = sanitizeHex(hex);
  return { "--brand": brand, "--brand-fg": contrastText(brand) };
}

const S = "[data-brand]";
export const BRAND_THEME_CSS = `
${S} .bg-rose-600{background-color:var(--brand)!important;color:var(--brand-fg)!important}
${S} .hover\\:bg-rose-700:hover{background-color:color-mix(in srgb,var(--brand) 85%,#000)!important}
${S} .text-rose-500,${S} .text-rose-600,${S} .text-rose-700,${S} .text-rose-800{color:color-mix(in srgb,var(--brand) 75%,#000)!important}
${S} .bg-rose-50,${S} .bg-rose-50\\/70,${S} .hover\\:bg-rose-50\\/30:hover{background-color:color-mix(in srgb,var(--brand) 8%,#fff)!important}
${S} .bg-rose-100,${S} .bg-rose-200\\/45{background-color:color-mix(in srgb,var(--brand) 16%,#fff)!important}
${S} .border-rose-100,${S} .border-rose-200,${S} .border-rose-200\\/70,${S} .hover\\:border-rose-200:hover,${S} .hover\\:border-rose-300:hover{border-color:color-mix(in srgb,var(--brand) 32%,#fff)!important}
${S} .border-rose-400,${S} .border-rose-600{border-color:var(--brand)!important}
${S} .ring-rose-100{--tw-ring-color:color-mix(in srgb,var(--brand) 18%,#fff)!important}
${S} .focus-visible\\:ring-rose-300:focus-visible{--tw-ring-color:color-mix(in srgb,var(--brand) 45%,#fff)!important}
`;

// Single source of truth for money formatting. Replaces hardcoded `$${x.toFixed(2)}`.
// Uses Intl.NumberFormat so each business's currency renders with its own symbol
// and conventions (e.g. £, €, $, ₹, ¥).

const ZERO_DECIMAL_CURRENCIES = new Set(["jpy", "krw", "vnd", "clp", "isk"]);

export function normalizeCurrency(value) {
  const c = String(value || "").trim().toLowerCase();
  return /^[a-z]{3}$/.test(c) ? c : "aud";
}

export function currencyFractionDigits(currency) {
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(currency)) ? 0 : 2;
}

// Format an amount in the given currency. Falls back gracefully if the
// runtime doesn't recognize the currency code.
// Pass { maximumFractionDigits: 0 } to render whole amounts without cents
// (e.g. package prices), while still using the correct currency symbol.
export function formatMoney(amount, currency = "aud", { locale, maximumFractionDigits } = {}) {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const cur = normalizeCurrency(currency);
  const baseDigits = currencyFractionDigits(cur);
  try {
    const opts = { style: "currency", currency: cur.toUpperCase() };
    if (Number.isFinite(maximumFractionDigits)) {
      opts.minimumFractionDigits = Math.min(baseDigits, maximumFractionDigits);
      opts.maximumFractionDigits = maximumFractionDigits;
    }
    return new Intl.NumberFormat(locale || undefined, opts).format(safe);
  } catch {
    const digits = Number.isFinite(maximumFractionDigits)
      ? Math.min(baseDigits, maximumFractionDigits)
      : baseDigits;
    return `${cur.toUpperCase()} ${safe.toFixed(digits)}`;
  }
}

// Just the currency symbol (e.g. "$", "£", "€"), for compact UI like input prefixes.
export function currencySymbol(currency = "aud", { locale } = {}) {
  const cur = normalizeCurrency(currency);
  try {
    const parts = new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency: cur.toUpperCase(),
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value || cur.toUpperCase();
  } catch {
    return cur.toUpperCase();
  }
}

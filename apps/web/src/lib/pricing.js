// Pro plan pricing per currency.
//
// We use round, locally-sensible prices per currency (not FX conversion), each
// backed by its own Stripe Price ID. To offer a new currency:
//   1. Create a monthly recurring Price in the Stripe dashboard for that amount.
//   2. Add its currency + amount below.
//   3. Set the matching env var (STRIPE_PRICE_PRO_<CUR>) to that Price ID.
//
// `amount` is the whole-unit price shown to users (e.g. 20 = A$20/mo).
// `stripePriceEnv` is the env var holding that currency's Stripe Price ID.
export const PRO_PLAN_PRICES = {
  aud: { amount: 20, stripePriceEnv: "STRIPE_PRICE_PRO_AUD" },
  usd: { amount: 15, stripePriceEnv: "STRIPE_PRICE_PRO_USD" },
  gbp: { amount: 12, stripePriceEnv: "STRIPE_PRICE_PRO_GBP" },
  eur: { amount: 14, stripePriceEnv: "STRIPE_PRICE_PRO_EUR" },
  cad: { amount: 20, stripePriceEnv: "STRIPE_PRICE_PRO_CAD" },
  nzd: { amount: 22, stripePriceEnv: "STRIPE_PRICE_PRO_NZD" },
  inr: { amount: 999, stripePriceEnv: "STRIPE_PRICE_PRO_INR" },
  sgd: { amount: 20, stripePriceEnv: "STRIPE_PRICE_PRO_SGD" },
  zar: { amount: 249, stripePriceEnv: "STRIPE_PRICE_PRO_ZAR" },
  aed: { amount: 55, stripePriceEnv: "STRIPE_PRICE_PRO_AED" },
  // Priced for the local market rather than converted from AUD, the same way
  // INR and ZAR are — a straight conversion (~LKR 4,000) prices out most
  // small Sri Lankan businesses.
  lkr: { amount: 2500, stripePriceEnv: "STRIPE_PRICE_PRO_LKR" },
};

// The default currency used when a business has none set or an unsupported one.
export const DEFAULT_PRO_CURRENCY = "aud";

// Legacy single-currency export kept for back-compat with any remaining callers.
export const PRO_PRICE_AUD = PRO_PLAN_PRICES.aud.amount;

// Every business is billed in AUD, whatever currency they trade in locally.
//
// Per-currency Pro prices still exist in PRO_PLAN_PRICES (and their Stripe
// Prices are already created), so re-enabling local billing later is a matter
// of flipping this flag back — no schema change, no migration. Local currency
// is still used everywhere else: package prices, invoices and quotes all render
// in the business's own currency.
export const BILL_IN_SINGLE_CURRENCY = true;

// Normalize an arbitrary currency to one we actually bill in. Falls back to AUD.
export function resolveProCurrency(currency) {
  if (BILL_IN_SINGLE_CURRENCY) return DEFAULT_PRO_CURRENCY;
  const c = String(currency || "").trim().toLowerCase();
  return PRO_PLAN_PRICES[c] ? c : DEFAULT_PRO_CURRENCY;
}

// The whole-unit Pro price for a business's currency (billing-supported currency).
export function proPriceAmount(currency) {
  return PRO_PLAN_PRICES[resolveProCurrency(currency)].amount;
}

// The Stripe Price ID for a business's currency, read from env. Returns null if
// that currency's env var is not configured.
export function proStripePriceId(currency) {
  const entry = PRO_PLAN_PRICES[resolveProCurrency(currency)];
  const id = process.env[entry.stripePriceEnv]?.trim();
  return id || null;
}

// Currencies a country can be assigned that have no Pro price defined at all.
// These businesses silently fall back to AUD at checkout, which reads as a bug
// to them. Surfaced by billingCurrencyWarning so the gap is visible in logs
// rather than discovered by a confused customer.
export function isBillableCurrency(currency) {
  const c = String(currency || "").trim().toLowerCase();
  return Boolean(PRO_PLAN_PRICES[c]);
}

/**
 * Returns a warning string when a business cannot be billed in its own
 * currency, or null when everything is configured. Two distinct gaps:
 *   1. No price defined for the currency at all (e.g. MYR, BRL, MXN, JPY).
 *   2. Price defined, but its Stripe Price ID env var is unset.
 */
export function billingCurrencyWarning(currency) {
  // While everyone is billed in one currency, billing in AUD is the intended
  // behaviour rather than a misconfiguration — only flag the default's own
  // Price being absent, which would stop checkout entirely.
  if (BILL_IN_SINGLE_CURRENCY) {
    const base = PRO_PLAN_PRICES[DEFAULT_PRO_CURRENCY];
    return process.env[base.stripePriceEnv]?.trim()
      ? null
      : `${base.stripePriceEnv} is not set — Pro checkout cannot start.`;
  }

  const raw = String(currency || "").trim().toLowerCase();
  if (!raw) return null;

  const entry = PRO_PLAN_PRICES[raw];
  if (!entry) {
    return `No Pro price defined for currency "${raw}" — checkout will bill in ${DEFAULT_PRO_CURRENCY.toUpperCase()}. Add it to PRO_PLAN_PRICES and create the matching Stripe Price.`;
  }
  if (!process.env[entry.stripePriceEnv]?.trim()) {
    // The default currency's own env var missing is a different (worse)
    // problem: there is nothing left to fall back to.
    if (raw === DEFAULT_PRO_CURRENCY) {
      return `${entry.stripePriceEnv} is not set — Pro checkout cannot start. Create that Price in Stripe and set the env var.`;
    }
    return `${entry.stripePriceEnv} is not set — checkout will bill in ${DEFAULT_PRO_CURRENCY.toUpperCase()} instead of ${raw.toUpperCase()}. Create that Price in Stripe and set the env var.`;
  }
  return null;
}

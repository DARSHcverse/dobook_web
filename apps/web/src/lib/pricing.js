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
};

// The default currency used when a business has none set or an unsupported one.
export const DEFAULT_PRO_CURRENCY = "aud";

// Legacy single-currency export kept for back-compat with any remaining callers.
export const PRO_PRICE_AUD = PRO_PLAN_PRICES.aud.amount;

// Normalize an arbitrary currency to one we actually bill in. Falls back to AUD.
export function resolveProCurrency(currency) {
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

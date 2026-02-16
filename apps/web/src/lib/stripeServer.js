import Stripe from "stripe";

let cachedStripe = null;

export function hasStripeConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe() {
  if (!hasStripeConfig()) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (cachedStripe) return cachedStripe;

  cachedStripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
    typescript: false,
  });
  return cachedStripe;
}

export function appBaseUrlFromRequest(request) {
  const origin = request?.headers?.get?.("origin")?.trim();
  if (origin) return origin.replace(/\/+$/, "");

  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}


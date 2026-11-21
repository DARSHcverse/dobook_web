// A business's own payment link (Stripe Payment Link, Square, PayPal...).
// It is free text entered in Settings and rendered as an <a href> to the
// business's customers, so only http(s) URLs are allowed: React 18 still
// renders `javascript:` hrefs, which would run script in the customer's page.
export function safePaymentLink(raw) {
  let value = String(raw || "").trim();
  if (!value) return "";
  // Owners often paste "paypal.me/name" without a scheme; assume https.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

const PAYMENT_STATUS_VALUES = new Set(["paid", "failed", "pending", "refunded", "cancelled"]);

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function utcMonthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function utcMonthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getStripeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value?.id === "string") return value.id.trim();
  return "";
}

export function normalizeStripeCurrency(value) {
  return String(value || "aud").trim().toLowerCase() || "aud";
}

export function stripeMinorUnitAmountToNumber(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount / 100;
}

export function normalizePaymentStatus(value, { allowAll = false } = {}) {
  const normalized = String(value || "").trim().toLowerCase();
  if (allowAll && (!normalized || normalized === "all")) return "all";
  if (PAYMENT_STATUS_VALUES.has(normalized)) return normalized;
  return "";
}

export function mapStripeEventStatus(eventType, object = {}) {
  switch (String(eventType || "").trim()) {
    case "payment_intent.succeeded":
    case "invoice.paid":
      return "paid";
    case "payment_intent.payment_failed":
    case "invoice.payment_failed":
      return "failed";
    case "checkout.session.completed":
      return String(object?.payment_status || "").trim().toLowerCase() === "paid" ? "paid" : "pending";
    case "customer.subscription.deleted":
      return "cancelled";
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscriptionStatus = String(object?.status || "").trim().toLowerCase();
      if (subscriptionStatus === "canceled" || subscriptionStatus === "cancelled") return "cancelled";
      if (subscriptionStatus === "unpaid" || subscriptionStatus === "past_due" || subscriptionStatus === "incomplete_expired") {
        return "failed";
      }
      return "pending";
    }
    default:
      return "pending";
  }
}

export function inferPaymentType(record) {
  const periodStart = parseDate(record?.period_start);
  const periodEnd = parseDate(record?.period_end);
  if (periodStart && periodEnd) {
    const diffDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000);
    if (diffDays >= 300) return "annual";
    if (diffDays >= 25) return "monthly";
  }

  if (getStripeId(record?.stripe_subscription_id)) return "monthly";
  return "one_time";
}

export function formatPaymentTypeLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "annual") return "Annual";
  if (normalized === "monthly") return "Monthly";
  return "One-time";
}

export function formatStripePeriodLabel(record) {
  const date = parseDate(record?.period_start) || parseDate(record?.created_at);
  if (!date) return "-";
  return MONTH_LABEL_FORMATTER.format(date);
}

export function serializeStripeEventRow(row) {
  const business =
    Array.isArray(row?.businesses) ? row.businesses[0] || null : row?.businesses || null;
  const amount = Number(row?.amount ?? 0);
  const paymentType = inferPaymentType(row);

  return {
    id: row?.id || "",
    business_id: row?.business_id || null,
    business_name: business?.business_name || "Unknown business",
    business_email: business?.email || "",
    stripe_event_id: row?.stripe_event_id || "",
    event_type: row?.event_type || "",
    amount: Number.isFinite(amount) ? amount : 0,
    currency: normalizeStripeCurrency(row?.currency),
    status: normalizePaymentStatus(row?.status) || "pending",
    description: row?.description || "",
    stripe_customer_id: row?.stripe_customer_id || "",
    stripe_subscription_id: row?.stripe_subscription_id || "",
    period_start: row?.period_start || null,
    period_end: row?.period_end || null,
    created_at: row?.created_at || null,
    payment_type: paymentType,
    payment_type_label: formatPaymentTypeLabel(paymentType),
    period_label: formatStripePeriodLabel(row),
  };
}

export function isCanonicalPaidEvent(record) {
  if (normalizePaymentStatus(record?.status) !== "paid") return false;
  const eventType = String(record?.event_type || "").trim();

  if (eventType === "invoice.paid") return true;
  if (eventType === "payment_intent.succeeded") return !getStripeId(record?.stripe_subscription_id);
  if (eventType === "checkout.session.completed") return !getStripeId(record?.stripe_subscription_id);
  return false;
}

export function isCanonicalFailedEvent(record) {
  if (normalizePaymentStatus(record?.status) !== "failed") return false;
  const eventType = String(record?.event_type || "").trim();

  if (eventType === "invoice.payment_failed") return true;
  if (eventType === "payment_intent.payment_failed") return !getStripeId(record?.stripe_subscription_id);
  return false;
}

export function sumStripeEventAmounts(records = []) {
  return records.reduce((sum, record) => {
    const amount = Number(record?.amount ?? 0);
    if (!Number.isFinite(amount)) return sum;
    return sum + amount;
  }, 0);
}

export function buildMonthlyRevenueSeries(records = [], months = 12) {
  const now = new Date();
  const monthStarts = [];
  const bucketLabels = new Map();
  const bucketValues = new Map();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = utcMonthKey(monthStart);
    monthStarts.push(monthStart);
    bucketLabels.set(key, MONTH_LABEL_FORMATTER.format(monthStart));
    bucketValues.set(key, 0);
  }

  const earliestMonth = monthStarts[0];
  records.forEach((record) => {
    if (!isCanonicalPaidEvent(record)) return;
    const createdAt = parseDate(record?.created_at);
    if (!createdAt || createdAt < earliestMonth) return;
    const key = utcMonthKey(utcMonthStart(createdAt));
    if (!bucketValues.has(key)) return;
    const amount = Number(record?.amount ?? 0);
    if (!Number.isFinite(amount)) return;
    bucketValues.set(key, bucketValues.get(key) + amount);
  });

  return monthStarts.map((monthStart) => {
    const key = utcMonthKey(monthStart);
    return {
      month: key,
      label: bucketLabels.get(key) || MONTH_LABEL_FORMATTER.format(monthStart),
      revenue: Number((bucketValues.get(key) || 0).toFixed(2)),
    };
  });
}

export function isInCurrentUtcMonth(value) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

export function buildStripeDashboardCustomerUrl(customerId) {
  const id = getStripeId(customerId);
  const base = String(process.env.STRIPE_SECRET_KEY || "").trim().startsWith("sk_test_")
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
  return id ? `${base}/customers/${id}` : base;
}

export function escapeCsvCell(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replaceAll('"', '""')}"`;
}

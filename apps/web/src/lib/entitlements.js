function parseEmailList(raw) {
  return String(raw || "")
    .split(/[,\s]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email) {
  const owners = parseEmailList(process.env.OWNER_EMAILS);
  if (!owners.length) return false;
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  return owners.includes(e);
}

export function isOwnerBusiness(business) {
  if (!business) return false;
  if (String(business.account_role || "").trim().toLowerCase() === "owner") return true;
  return isOwnerEmail(business.email);
}

export function hasProAccess(business) {
  if (!business) return false;
  if (isOwnerBusiness(business)) return true;
  return String(business.subscription_plan || "free").trim().toLowerCase() === "pro";
}

// Free plan cap. Single source of truth — imported by the booking routes
// (enforcement) and the dashboard (display) so they can never drift.
export const FREE_PLAN_MAX_BOOKINGS_PER_MONTH = 50;

// Given the count of bookings created this month, summarize free-plan usage.
// Pro/owner accounts are unlimited.
export function getFreePlanUsage(business, bookingsThisMonth) {
  const used = Math.max(0, Number(bookingsThisMonth) || 0);
  if (hasProAccess(business)) {
    return { unlimited: true, used, limit: null, remaining: null, atLimit: false, nearLimit: false };
  }
  const limit = FREE_PLAN_MAX_BOOKINGS_PER_MONTH;
  const remaining = Math.max(0, limit - used);
  return {
    unlimited: false,
    used,
    limit,
    remaining,
    atLimit: used >= limit,
    nearLimit: used >= Math.floor(limit * 0.8), // 80%
  };
}


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


export function minimizeBusinessForStorage(business) {
  if (!business || typeof business !== "object") return null;
  return {
    id: business.id,
    business_name: business.business_name,
    email: business.email,
    subscription_plan: business.subscription_plan,
    subscription_status: business.subscription_status,
    account_role: business.account_role,
    industry: business.industry,
  };
}


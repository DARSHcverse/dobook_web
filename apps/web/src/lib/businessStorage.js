export function minimizeBusinessForStorage(business) {
  if (!business || typeof business !== "object") return null;
  return {
    id: business.id,
    business_name: business.business_name,
    email: business.email,
    logo_url: business.logo_url,
    phone: business.phone,
    business_address: business.business_address,
    subscription_plan: business.subscription_plan,
    subscription_status: business.subscription_status,
    account_role: business.account_role,
    industry: business.industry,
    booth_types: business.booth_types,
    public_services: business.public_services,
    public_enabled: business.public_enabled,
    public_description: business.public_description,
    public_postcode: business.public_postcode,
    public_photos: business.public_photos,
    public_website: business.public_website,
  };
}

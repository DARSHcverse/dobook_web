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
    onboarding_tour_completed_at: business.onboarding_tour_completed_at,
    reminders_enabled: business.reminders_enabled,
    reminder_times: business.reminder_times,
    reminder_custom_message: business.reminder_custom_message,
    reminder_include_payment_link: business.reminder_include_payment_link,
    reminder_include_booking_details: business.reminder_include_booking_details,
    confirmation_email_enabled: business.confirmation_email_enabled,
  };
}

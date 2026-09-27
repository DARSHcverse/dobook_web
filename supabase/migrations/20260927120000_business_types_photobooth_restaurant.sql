-- Allow the two business types added in the app but never added to the DB
-- constraint: 'photobooth' and 'restaurant_venue'.
--
-- Without this, signing up in either industry fails with
--   new row for relation "businesses" violates check constraint
--   "businesses_business_type_check"
-- which surfaces as a 400 on /api/auth/register. photobooth is the DEFAULT
-- industry, so this blocked the most common signup path.
--
-- Generated: 2026-09-27

begin;

alter table if exists public.businesses
  drop constraint if exists businesses_business_type_check;

alter table public.businesses
  add constraint businesses_business_type_check
  check (
    business_type is null
    or business_type in (
      'photobooth',
      'salon_barbershop',
      'medical_wellness',
      'consultant',
      'tutoring_education',
      'home_services_trades',
      'cleaning_services',
      'fitness_training',
      'pet_services',
      'events_photography',
      'automotive',
      'beauty_spa',
      'legal_advisory',
      'restaurant_venue'
    )
  );

commit;

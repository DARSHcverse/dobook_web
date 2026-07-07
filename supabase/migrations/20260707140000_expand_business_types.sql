-- Expand the set of supported business types beyond the original 5.
-- Adds: cleaning, fitness, pet services, events/photography, automotive,
-- beauty/spa, and legal/advisory.
-- Generated: 2026-07-07

begin;

-- Recreate the check constraint with the expanded list.
alter table if exists public.businesses
  drop constraint if exists businesses_business_type_check;

alter table public.businesses
  add constraint businesses_business_type_check
  check (
    business_type is null
    or business_type in (
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
      'legal_advisory'
    )
  );

commit;

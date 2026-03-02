begin;

alter table public.businesses
  add column if not exists onboarding_tour_completed_at timestamptz;

create index if not exists businesses_onboarding_tour_completed_at_idx
  on public.businesses (onboarding_tour_completed_at);

commit;


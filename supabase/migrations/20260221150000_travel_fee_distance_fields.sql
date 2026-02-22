-- Distance-based travel fee fields
-- Generated: 2026-02-21

begin;

alter table if exists public.businesses
  add column if not exists travel_fee_free_km integer not null default 40,
  add column if not exists travel_fee_rate_per_km numeric(10,2) not null default 0.40;

alter table if exists public.bookings
  add column if not exists distance_km numeric(10,2),
  add column if not exists travel_km_billable integer,
  add column if not exists travel_fee_amount numeric(10,2);

create index if not exists bookings_distance_km_idx on public.bookings (distance_km);

commit;


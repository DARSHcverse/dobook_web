-- Opening hours, slot rules and capacity per business (see lib/availability.js).
-- NULL = the owner has not set hours yet: nothing is enforced, so existing
-- businesses keep working exactly as before until they opt in.
alter table public.businesses
  add column if not exists availability jsonb;

-- Speeds up the per-day slot lookups on the public booking page.
create index if not exists bookings_business_date_idx
  on public.bookings (business_id, booking_date);

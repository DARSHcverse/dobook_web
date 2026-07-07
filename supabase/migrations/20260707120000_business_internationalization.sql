-- Internationalization: per-business country, currency, distance unit, timezone.
-- Makes dobook country-neutral instead of AU-hardcoded.
-- Existing businesses are backfilled to AU defaults so nothing changes for them.
-- Generated: 2026-07-07

begin;

alter table if exists public.businesses
  add column if not exists country_code text not null default 'AU',
  add column if not exists currency text not null default 'aud',
  add column if not exists distance_unit text not null default 'km',
  add column if not exists timezone text not null default 'Australia/Sydney';

-- distance_unit must be km or mi
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_distance_unit_check'
  ) then
    alter table public.businesses
      add constraint businesses_distance_unit_check
      check (distance_unit in ('km', 'mi'));
  end if;
end $$;

-- country_code should be a 2-letter ISO code (uppercase); allow legacy/empty as AU fallback handled in app
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_country_code_check'
  ) then
    alter table public.businesses
      add constraint businesses_country_code_check
      check (country_code ~ '^[A-Z]{2}$');
  end if;
end $$;

-- currency should be a 3-letter ISO-4217 code stored lowercase
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_currency_check'
  ) then
    alter table public.businesses
      add constraint businesses_currency_check
      check (currency ~ '^[a-z]{3}$');
  end if;
end $$;

commit;

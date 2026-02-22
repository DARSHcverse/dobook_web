-- Public business profile fields (for the customer directory / discovery page)
-- Generated: 2026-02-21

begin;

alter table if exists public.businesses
  add column if not exists public_enabled boolean not null default false,
  add column if not exists public_description text not null default '',
  add column if not exists public_postcode text not null default '',
  add column if not exists public_photos jsonb not null default '[]'::jsonb,
  add column if not exists public_website text not null default '';

create index if not exists businesses_public_enabled_idx on public.businesses (public_enabled);
create index if not exists businesses_public_postcode_idx on public.businesses (public_postcode);

commit;


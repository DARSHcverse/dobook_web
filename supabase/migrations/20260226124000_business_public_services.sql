-- Public services list for business profiles (discover details page)
-- Generated: 2026-02-26

begin;

alter table if exists public.businesses
  add column if not exists public_services jsonb not null default '[]'::jsonb;

commit;


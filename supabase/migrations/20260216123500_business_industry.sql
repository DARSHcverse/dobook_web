begin;

alter table if exists public.businesses
  add column if not exists industry text not null default 'photobooth';

commit;


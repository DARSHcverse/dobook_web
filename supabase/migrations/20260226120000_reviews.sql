-- Reviews (moderated: pending -> approved/rejected)
-- Generated: 2026-02-26

begin;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_name text not null,
  rating integer not null,
  comment text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_status_allowed check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists reviews_business_id_idx on public.reviews (business_id);
create index if not exists reviews_status_idx on public.reviews (status);
create index if not exists reviews_created_at_idx on public.reviews (created_at);

alter table if exists public.reviews enable row level security;

commit;


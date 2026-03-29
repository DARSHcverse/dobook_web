-- Review invites (business requests customer review via email link)
-- Generated: 2026-03-02

begin;

create table if not exists public.review_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id uuid null references public.bookings(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  used_at timestamptz null,
  review_id uuid null references public.reviews(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  updated_at timestamptz not null default now()
);

create index if not exists review_invites_business_id_idx on public.review_invites (business_id);
create index if not exists review_invites_booking_id_idx on public.review_invites (booking_id);
create index if not exists review_invites_token_idx on public.review_invites (token);
create index if not exists review_invites_expires_at_idx on public.review_invites (expires_at);

alter table if exists public.review_invites enable row level security;

commit;


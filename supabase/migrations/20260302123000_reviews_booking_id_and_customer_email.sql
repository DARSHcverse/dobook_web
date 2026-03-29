-- Add optional linkage fields for invited customer reviews
-- Generated: 2026-03-02

begin;

alter table if exists public.reviews
  add column if not exists booking_id uuid null references public.bookings(id) on delete set null;

alter table if exists public.reviews
  add column if not exists customer_email text null;

create index if not exists reviews_booking_id_idx on public.reviews (booking_id);

commit;


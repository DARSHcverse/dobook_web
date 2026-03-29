-- Add payment fields to bookings.
-- Generated: 2026-03-13

begin;

alter table if exists public.bookings
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_method text not null default '';

commit;

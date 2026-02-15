-- Booking editor customization + email tracking
-- Generated: 2026-02-15

begin;

alter table if exists public.businesses
  add column if not exists booth_types text[] not null default array['Open Booth','Glam Booth','Enclosed Booth'],
  add column if not exists booking_custom_fields jsonb not null default '[]'::jsonb;

alter table if exists public.bookings
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists business_notice_sent_at timestamptz,
  add column if not exists reminder_5d_sent_at timestamptz,
  add column if not exists reminder_1d_sent_at timestamptz;

create index if not exists bookings_reminder_5d_sent_at_idx on public.bookings (reminder_5d_sent_at);
create index if not exists bookings_reminder_1d_sent_at_idx on public.bookings (reminder_1d_sent_at);

commit;


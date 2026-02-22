-- Add invoice line items + totals to bookings, and surcharge settings to businesses.
-- Generated: 2026-02-21

begin;

-- businesses: optional surcharges that can be applied on bookings/invoices
alter table if exists public.businesses
  add column if not exists travel_fee_enabled boolean not null default false,
  add column if not exists travel_fee_label text not null default 'Travel fee',
  add column if not exists travel_fee_amount numeric(10,2) not null default 0,
  add column if not exists cbd_fee_enabled boolean not null default false,
  add column if not exists cbd_fee_label text not null default 'CBD logistics',
  add column if not exists cbd_fee_amount numeric(10,2) not null default 0;

-- bookings: support multiple invoice lines and an explicit total
alter table if exists public.bookings
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists total_amount numeric(10,2) not null default 0;

-- backfill totals for existing rows
update public.bookings
set total_amount = coalesce(total_amount, 0) + 0
where total_amount = 0;

update public.bookings
set total_amount = coalesce(price, 0) * greatest(coalesce(quantity, 1), 1)
where (total_amount is null or total_amount = 0);

commit;


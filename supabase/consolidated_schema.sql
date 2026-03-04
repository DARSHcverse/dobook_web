-- DoBook initial schema (matches current localdb.json shape)
-- Generated: 2026-02-15
--
-- Notes:
-- - This schema keeps the app's current custom auth model (businesses + sessions).
-- - If you later migrate to Supabase Auth, you can replace `sessions` and `password_hash`.

begin;

-- Extensions
create extension if not exists pgcrypto;

-- businesses (acts as "users" in the current app)
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  email text not null,
  phone text,
  business_address text not null default '',
  abn text not null default '',
  logo_url text not null default '',
  bank_name text not null default '',
  account_name text not null default '',
  bsb text not null default '',
  account_number text not null default '',
  payment_link text not null default '',
  subscription_plan text not null default 'free',
  booking_count integer not null default 0,
  invoice_seq integer not null default 0,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists businesses_email_key on public.businesses (lower(email));

-- sessions (bearer tokens used by API routes)
create table if not exists public.sessions (
  token uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_business_id_idx on public.sessions (business_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  service_type text not null default 'Service',
  booth_type text not null default '',
  package_duration text not null default '',
  event_location text not null default '',
  booking_date date,
  booking_time time,
  end_time time,
  duration_minutes integer not null default 60,
  parking_info text not null default '',
  notes text not null default '',
  price numeric(10,2) not null default 0,
  quantity integer not null default 1,
  status text not null default 'confirmed',
  invoice_id text,
  invoice_date timestamptz,
  due_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bookings_business_id_idx on public.bookings (business_id);
create index if not exists bookings_booking_date_idx on public.bookings (booking_date);
create index if not exists bookings_status_idx on public.bookings (status);

-- Ensure invoice_id is unique per business when present
create unique index if not exists bookings_business_invoice_id_key
  on public.bookings (business_id, invoice_id)
  where invoice_id is not null and invoice_id <> '';

-- invoice templates
create table if not exists public.invoice_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  template_name text not null default 'Classic',
  logo_url text,
  primary_color text not null default '#e11d48',
  created_at timestamptz not null default now()
);

create index if not exists invoice_templates_business_id_idx on public.invoice_templates (business_id);

-- extractions (PDF extraction results)
create table if not exists public.extractions (
  id uuid primary key default gen_random_uuid(),
  processing_status text not null default 'success',
  extracted_data jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists extractions_created_at_idx on public.extractions (created_at);

-- invoices (reserved for future; the current frontend generates PDFs client-side)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  invoice_number text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoices_business_id_idx on public.invoices (business_id);
create index if not exists invoices_booking_id_idx on public.invoices (booking_id);

commit;

-- Helpers for DoBook on Supabase Postgres
-- Generated: 2026-02-15

begin;

-- Atomically increments invoice_seq and returns a formatted invoice id.
create or replace function public.next_invoice_id(p_business_id uuid)
returns table(invoice_id text, seq integer)
language plpgsql
as $$
declare
  next_seq integer;
begin
  update public.businesses
    set invoice_seq = coalesce(invoice_seq, 0) + 1
    where id = p_business_id
    returning invoice_seq into next_seq;

  if not found then
    raise exception 'Business not found';
  end if;

  seq := next_seq;
  invoice_id := 'PB-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(next_seq::text, 3, '0');
  return next;
end;
$$;

commit;

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

-- Enable RLS to prevent direct access via anon/authenticated keys.
-- Note: service_role bypasses RLS, so keep that key server-only.
-- Generated: 2026-02-15

begin;

alter table if exists public.businesses enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.bookings enable row level security;
alter table if exists public.invoice_templates enable row level security;
alter table if exists public.extractions enable row level security;
alter table if exists public.invoices enable row level security;

commit;

begin;

-- Stripe subscription fields (optional; kept nullable for easy rollout)
alter table if exists public.businesses
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_current_period_end timestamptz;

create index if not exists businesses_stripe_customer_id_idx on public.businesses (stripe_customer_id);
create index if not exists businesses_stripe_subscription_id_idx on public.businesses (stripe_subscription_id);

commit;

begin;

alter table if exists public.businesses
  add column if not exists industry text not null default 'photobooth';

commit;

-- Add an explicit account role for owner/admin-style access.
-- This enables a "website owner" to have full access without going through Stripe.
-- Generated: 2026-02-16

begin;

alter table if exists public.businesses
  add column if not exists account_role text not null default 'user';

create index if not exists businesses_account_role_idx on public.businesses (account_role);

commit;
alter table if exists public.bookings
  add column if not exists reminder_5d_scheduled_at timestamptz,
  add column if not exists reminder_1d_scheduled_at timestamptz;

create index if not exists bookings_reminder_5d_scheduled_at_idx on public.bookings (reminder_5d_scheduled_at);
create index if not exists bookings_reminder_1d_scheduled_at_idx on public.bookings (reminder_1d_scheduled_at);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists password_reset_tokens_token_hash_key on public.password_reset_tokens (token_hash);
create index if not exists password_reset_tokens_business_id_idx on public.password_reset_tokens (business_id);
create index if not exists password_reset_tokens_expires_at_idx on public.password_reset_tokens (expires_at);

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

-- Distance-based travel fee fields
-- Generated: 2026-02-21

begin;

alter table if exists public.businesses
  add column if not exists travel_fee_free_km integer not null default 40,
  add column if not exists travel_fee_rate_per_km numeric(10,2) not null default 0.40;

alter table if exists public.bookings
  add column if not exists distance_km numeric(10,2),
  add column if not exists travel_km_billable integer,
  add column if not exists travel_fee_amount numeric(10,2);

create index if not exists bookings_distance_km_idx on public.bookings (distance_km);

commit;

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

-- Platform reviews for DoBook (submitted by businesses, moderated by admin)
-- Generated: 2026-02-26

begin;

create table if not exists public.platform_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  business_name text not null,
  rating integer not null,
  comment text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_reviews_rating_range check (rating between 1 and 5),
  constraint platform_reviews_status_allowed check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists platform_reviews_business_id_idx on public.platform_reviews (business_id);
create index if not exists platform_reviews_status_idx on public.platform_reviews (status);
create index if not exists platform_reviews_created_at_idx on public.platform_reviews (created_at);

alter table if exists public.platform_reviews enable row level security;

commit;

-- Public services list for business profiles (discover details page)
-- Generated: 2026-02-26

begin;

alter table if exists public.businesses
  add column if not exists public_services jsonb not null default '[]'::jsonb;

commit;

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

-- Add optional linkage fields for invited customer reviews
-- Generated: 2026-03-02

begin;

alter table if exists public.reviews
  add column if not exists booking_id uuid null references public.bookings(id) on delete set null;

alter table if exists public.reviews
  add column if not exists customer_email text null;

create index if not exists reviews_booking_id_idx on public.reviews (booking_id);

commit;

begin;

alter table public.businesses
  add column if not exists onboarding_tour_completed_at timestamptz;

create index if not exists businesses_onboarding_tour_completed_at_idx
  on public.businesses (onboarding_tour_completed_at);

commit;

-- Extend invoice_templates with structured design settings
-- Generated: 2026-03-03

begin;

alter table if exists public.invoice_templates
  add column if not exists secondary_color text,
  add column if not exists font_family text default 'helvetica',
  add column if not exists logo_position text default 'left',
  add column if not exists show_abn boolean default true,
  add column if not exists show_due_date boolean default true,
  add column if not exists show_notes boolean default true,
  add column if not exists table_style text default 'minimal',
  add column if not exists footer_text text;

commit;


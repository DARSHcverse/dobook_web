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


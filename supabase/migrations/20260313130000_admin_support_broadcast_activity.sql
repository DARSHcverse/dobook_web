begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  business_email text not null default '',
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_business_id_idx on public.support_tickets (business_id);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at);

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  audience text not null,
  sent_count integer not null default 0,
  body text,
  created_at timestamptz not null default now()
);

create index if not exists broadcasts_created_at_idx on public.broadcasts (created_at);

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_business_id uuid references public.businesses(id) on delete set null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_log_created_at_idx on public.admin_activity_log (created_at);
create index if not exists admin_activity_log_target_business_id_idx on public.admin_activity_log (target_business_id);

alter table if exists public.businesses
  add column if not exists admin_notes text not null default '',
  add column if not exists subscription_status_changed_at timestamptz;

commit;

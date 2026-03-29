begin;

create extension if not exists pgcrypto;

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  stripe_event_id text not null unique,
  event_type text not null,
  amount numeric,
  currency text not null default 'aud',
  status text not null default 'pending',
  description text,
  stripe_customer_id text,
  stripe_subscription_id text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists stripe_events_business_id_idx on public.stripe_events (business_id);
create index if not exists stripe_events_status_idx on public.stripe_events (status);
create index if not exists stripe_events_created_at_idx on public.stripe_events (created_at desc);
create index if not exists stripe_events_customer_id_idx on public.stripe_events (stripe_customer_id);
create index if not exists stripe_events_subscription_id_idx on public.stripe_events (stripe_subscription_id);
create index if not exists stripe_events_event_type_idx on public.stripe_events (event_type);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stripe_events_status_check'
  ) then
    alter table public.stripe_events
      add constraint stripe_events_status_check
      check (status in ('paid', 'failed', 'pending', 'refunded', 'cancelled'));
  end if;
end $$;

alter table if exists public.stripe_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_events'
      and policyname = 'stripe_events_select_admin'
  ) then
    create policy stripe_events_select_admin
      on public.stripe_events
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.businesses
          where id = auth.uid()
            and account_role = 'owner'
        )
      );
  end if;
end $$;

commit;

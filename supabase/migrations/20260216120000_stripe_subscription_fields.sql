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


-- Add an explicit account role for owner/admin-style access.
-- This enables a "website owner" to have full access without going through Stripe.
-- Generated: 2026-02-16

begin;

alter table if exists public.businesses
  add column if not exists account_role text not null default 'user';

create index if not exists businesses_account_role_idx on public.businesses (account_role);

commit;

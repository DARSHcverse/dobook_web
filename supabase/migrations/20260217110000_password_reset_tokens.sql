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


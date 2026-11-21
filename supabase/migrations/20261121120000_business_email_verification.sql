-- Email verification for business accounts (anti-spam; see lib/emailVerification.js).
-- NULL = signed up but has not clicked the verification link yet.
alter table public.businesses
  add column if not exists email_verified_at timestamptz;

-- Grandfather every account that existed before verification shipped, so no
-- current business loses its booking page.
update public.businesses
set email_verified_at = coalesce(created_at, now())
where email_verified_at is null;

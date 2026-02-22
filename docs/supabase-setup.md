# Supabase Setup (Schema)

This repo currently stores data in `apps/web/localdb.json` via Next.js `/api/*` routes.
To use Supabase Postgres, create the tables first.

## Create tables

1. Open Supabase Dashboard → **SQL Editor**
2. Create a **New query**
3. Open `supabase/migrations/20260215160000_init_dobook.sql`, copy its SQL contents, paste into the editor, and run it
4. Open `supabase/migrations/20260215160500_rpc_invoice.sql`, copy its SQL contents, paste into the editor, and run it
5. Open `supabase/migrations/20260215180000_booking_editor_fields_and_reminders.sql`, copy its SQL contents, paste into the editor, and run it
6. Open `supabase/migrations/20260216120000_stripe_subscription_fields.sql`, copy its SQL contents, paste into the editor, and run it
7. Open `supabase/migrations/20260216123500_business_industry.sql`, copy its SQL contents, paste into the editor, and run it
8. Open `supabase/migrations/20260216130000_business_account_role.sql`, copy its SQL contents, paste into the editor, and run it
9. Open `supabase/migrations/20260217090000_booking_reminder_scheduled_at.sql`, copy its SQL contents, paste into the editor, and run it
10. Open `supabase/migrations/20260217110000_password_reset_tokens.sql`, copy its SQL contents, paste into the editor, and run it
11. (Recommended) Open `supabase/migrations/20260215183000_enable_rls.sql`, copy its SQL contents, paste into the editor, and run it

## What gets created

- `public.businesses` (acts as "users" today)
- `public.sessions` (bearer tokens)
- `public.bookings`
- `public.invoice_templates`
- `public.extractions`
- `public.invoices` (optional / future use)

## Next step (wiring the app)

After tables exist, the Next.js API routes in `apps/web/src/app/api/*` need to be updated to read/write Supabase instead of `apps/web/localdb.json`.

## App dependency + env vars

- The Next.js app uses `@supabase/supabase-js` (see `apps/web/src/lib/supabaseAdmin.js`).
- For server-side routes, set `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` (recommended). This repo also accepts `SUBABASE_API_KEY` / `SUPABASE_API_KEY` as the key env var name, but it must be a **service_role** key (especially after enabling RLS).
- For client-side usage, prefer `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Optional: set `OWNER_EMAILS` to grant “owner access” (Pro features without Stripe) to specific emails.

## Emails + reminders (optional)

- Booking confirmation emails (client + business) are sent via Resend when `RESEND_API_KEY` is set.
- To send real emails, you must add/verify an email domain in Resend and set `RESEND_FROM` (example: `DoBook <no-reply@yourdomain.com>`).
- If you don't have a domain yet, you can still test by setting `RESEND_FROM=DoBook <onboarding@resend.dev>` and using a Resend test inbox as the recipient (like `delivered@resend.dev`). In that mode, this repo will skip sending to non-`@resend.dev` recipients unless you set `RESEND_ACCOUNT_EMAIL`.
- Client reminder emails are sent 5 days + 1 day before the event via `POST`/`GET` `apps/web/src/app/api/cron/send-reminders/route.js` (protect with `CRON_SECRET`).
- On Vercel, set up a daily Cron to call `/api/cron/send-reminders` and include the secret (either `Authorization: Bearer $CRON_SECRET` or `?cron_secret=$CRON_SECRET`).
- If `CRON_SECRET` is not set, the app schedules reminder emails via Resend at booking creation time (set `REMINDERS_SCHEDULE_VIA_RESEND=true` to force this even when `CRON_SECRET` is set).
- Password reset emails are sent via Resend when `RESEND_API_KEY` is set (reset link goes to `/auth?reset=1&token=...`).

## Applying new migrations (important)

If you pull the latest code and the UI shows errors like **“Failed to update settings”**, your Supabase database may be missing newly-added columns.

Apply the latest SQL migrations from `supabase/migrations/` to your Supabase project (in order). Recently added:

- `20260221120000_booking_line_items_and_surcharges.sql`
- `20260221130000_business_public_profile.sql`

You can run them via the Supabase SQL editor or via the Supabase CLI migrations workflow.

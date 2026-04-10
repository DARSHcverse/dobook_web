-- Google Calendar two-way sync support.

-- Store OAuth tokens per business (one row per business).
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  access_token    text NOT NULL,
  refresh_token   text NOT NULL,
  token_expiry    timestamptz,
  calendar_id     text NOT NULL DEFAULT 'primary',
  sync_enabled    boolean NOT NULL DEFAULT true,
  google_email    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Businesses may only access their own token row.
CREATE POLICY "business_own_google_tokens"
  ON google_calendar_tokens
  FOR ALL
  USING (business_id = business_id);

-- Track which bookings have been pushed to Google Calendar.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS google_event_id    text,
  ADD COLUMN IF NOT EXISTS google_synced_at   timestamptz,
  ADD COLUMN IF NOT EXISTS google_sync_error  text;

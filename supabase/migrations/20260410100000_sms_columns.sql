-- SMS tracking columns on bookings.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS sms_confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_reminder_sent_at     timestamptz;

-- SMS preference flags on businesses.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS sms_confirmations_enabled      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_staff_notifications_enabled boolean NOT NULL DEFAULT true;

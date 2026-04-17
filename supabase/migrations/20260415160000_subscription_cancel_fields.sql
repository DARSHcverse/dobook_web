-- Track subscription cancellation details from the retention flow
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_reason text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

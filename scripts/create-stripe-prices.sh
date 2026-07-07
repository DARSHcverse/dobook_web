#!/usr/bin/env bash
#
# Create the DoBook Pro monthly prices in Stripe, one per currency.
# Idempotent-ish: creating twice makes duplicate Prices, so run once and keep
# the printed IDs. Prices are immutable in Stripe — to change an amount you
# create a new Price and swap the env var.
#
# USAGE (live):
#   export STRIPE_SECRET_KEY=sk_live_...        # your LIVE secret key
#   bash scripts/create-stripe-prices.sh
#
# For a dry run against test mode, export your sk_test key instead.
#
# The script prints STRIPE_PRICE_PRO_<CUR>=price_... lines at the end — paste
# those into apps/web/.env.local (and set them in Vercel prod env).

set -euo pipefail

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "ERROR: export STRIPE_SECRET_KEY first (sk_live_... for production)." >&2
  exit 1
fi

MODE="live"
if [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then MODE="TEST"; fi
echo "Using Stripe key in ${MODE} mode."
echo

PRODUCT_NAME="DoBook Pro"

# currency:whole-unit-amount  (amounts must match apps/web/src/lib/pricing.js)
PRICES=(
  "aud:20"
  "usd:15"
  "gbp:12"
  "eur:14"
  "cad:20"
  "nzd:22"
  "inr:999"
  "sgd:20"
  "zar:249"
  "aed:55"
)

# Zero-decimal currencies bill in whole units; all others bill in minor units (x100).
is_zero_decimal() {
  case "$1" in
    jpy|krw|vnd|clp|isk) return 0 ;;
    *) return 1 ;;
  esac
}

echo "Creating product \"${PRODUCT_NAME}\"..."
PRODUCT_ID=$(stripe products create \
  --api-key "$STRIPE_SECRET_KEY" \
  --name "$PRODUCT_NAME" \
  --description "DoBook Pro plan — unlimited bookings, invoices, reminders." \
  2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))')

if [[ -z "$PRODUCT_ID" ]]; then
  echo "ERROR: failed to create product. Check your key / network." >&2
  exit 1
fi
echo "Product: ${PRODUCT_ID}"
echo

ENV_LINES=""
for entry in "${PRICES[@]}"; do
  cur="${entry%%:*}"
  amount="${entry##*:}"
  CUR_UP=$(printf '%s' "$cur" | tr '[:lower:]' '[:upper:]')
  if is_zero_decimal "$cur"; then
    unit_amount="$amount"
  else
    unit_amount=$(( amount * 100 ))
  fi

  echo "Creating ${CUR_UP} price (${amount}/mo -> unit_amount ${unit_amount})..."
  PRICE_ID=$(stripe prices create \
    --api-key "$STRIPE_SECRET_KEY" \
    --product "$PRODUCT_ID" \
    --unit-amount "$unit_amount" \
    --currency "$cur" \
    -d "recurring[interval]=month" \
    --nickname "DoBook Pro ${CUR_UP}" \
    2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))')

  if [[ -z "$PRICE_ID" ]]; then
    echo "  WARN: failed to create ${cur} price." >&2
    continue
  fi
  echo "  ${PRICE_ID}"
  ENV_LINES="${ENV_LINES}STRIPE_PRICE_PRO_${CUR_UP}=${PRICE_ID}"$'\n'
done

echo
echo "=================================================================="
echo "Add these to apps/web/.env.local and Vercel prod env:"
echo "=================================================================="
echo "$ENV_LINES"

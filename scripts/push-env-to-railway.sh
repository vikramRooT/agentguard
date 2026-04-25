#!/usr/bin/env bash
# Push .env vars to Railway's agentguard-api service. Run from repo root.
#
# Skips NEXT_PUBLIC_* (those belong on Vercel), API_PORT/WEB_PORT (Railway
# assigns its own ports), and swaps DATABASE_URL/REDIS_URL for Railway
# service references so rotations work automatically.
set -euo pipefail

ENV_FILE="${1:-.env}"
SERVICE="${RAILWAY_SERVICE:-agentguard-api}"

declare -a args=()

while IFS= read -r line; do
  # Strip CRLF: Windows .env files leave a trailing \r that gets baked
  # into env values and breaks any HTTP header (e.g. "Invalid character
  # in header content [\"Authorization\"]" from the Circle SDK).
  line="${line%$'\r'}"
  # Strip comments + blank lines.
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  # Only lines that look like KEY=value.
  [[ ! "$line" =~ ^[A-Z_][A-Z0-9_]*= ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  # Railway rejects empty values — skip them.
  [[ -z "$value" ]] && continue

  case "$key" in
    NEXT_PUBLIC_*|API_PORT|WEB_PORT|API_BASE_URL|WEB_BASE_URL)
      continue
      ;;
    DATABASE_URL)
      value='${{Postgres.DATABASE_URL}}'
      ;;
    REDIS_URL)
      value='${{Redis.REDIS_URL}}'
      ;;
  esac

  args+=("$key=$value")
done < "$ENV_FILE"

# Append Railway-managed runtime vars.
args+=(
  "NODE_ENV=production"
  "PORT=4000"
  "LOG_LEVEL=info"
)

echo "Setting ${#args[@]} variables on service: $SERVICE"
railway variable set --service "$SERVICE" --skip-deploys "${args[@]}"

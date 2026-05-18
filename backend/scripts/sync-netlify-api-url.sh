#!/usr/bin/env bash
# Legge API_URL da backend/.env e allinea NEXT_PUBLIC_API_URL su Netlify + deploy.
# Richiede in .env: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID (opzionale: NETLIFY_ACCOUNT_ID)
set -euo pipefail

BACKEND="${1:-$HOME/CRM-APP/backend}"
ENV_FILE="$BACKEND/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Errore: $ENV_FILE non trovato"
  exit 1
fi

get_env() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true
}

API_URL=$(get_env API_URL)
TOKEN=$(get_env NETLIFY_AUTH_TOKEN)
SITE_ID=$(get_env NETLIFY_SITE_ID)

if [[ -z "$API_URL" ]] || [[ "$API_URL" != https://* ]]; then
  echo "Errore: API_URL mancante o non https in $ENV_FILE"
  exit 1
fi

API_URL="${API_URL%/}"

if [[ -z "$TOKEN" ]]; then
  echo "Manca NETLIFY_AUTH_TOKEN in $ENV_FILE"
  echo "Crea un token: Netlify → User settings → Applications → New access token"
  echo "Poi da Windows: .\\scripts\\netlify-aggiorna-api-url.ps1 \"$API_URL\""
  exit 1
fi

if [[ -z "$SITE_ID" ]]; then
  SITE_ID="6262024d-df81-4d4c-867b-1410dba7a9dd"
  echo "NETLIFY_SITE_ID non in .env — uso default nicoloservice"
fi

echo "==> Netlify: NEXT_PUBLIC_API_URL=$API_URL"

if command -v netlify >/dev/null 2>&1; then
  (
    cd "$(dirname "$BACKEND")/frontend" 2>/dev/null || cd "$BACKEND/.."
    export NETLIFY_AUTH_TOKEN="$TOKEN"
    netlify env:set NEXT_PUBLIC_API_URL "$API_URL" --context production --auth "$TOKEN"
    netlify api createSiteBuild --auth "$TOKEN" \
      --data "{\"site_id\":\"${SITE_ID}\",\"clear_cache\":true}"
  )
  echo "OK (Netlify CLI). Attendi deploy su app.netlify.com"
  exit 0
fi

# Fallback API REST
HTTP_CODE=$(curl -sS -o /tmp/netlify-env-out.json -w "%{http_code}" \
  -X PATCH "https://api.netlify.com/api/v1/sites/${SITE_ID}/env/NEXT_PUBLIC_API_URL" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"NEXT_PUBLIC_API_URL\",\"scopes\":[\"production\"],\"values\":[{\"value\":\"${API_URL}\",\"context\":\"production\"}]}" \
  2>/dev/null || echo "000")

if [[ "$HTTP_CODE" != "200" ]] && [[ "$HTTP_CODE" != "201" ]]; then
  # Prova creazione env (siti senza variabile ancora)
  HTTP_CODE=$(curl -sS -o /tmp/netlify-env-out.json -w "%{http_code}" \
    -X POST "https://api.netlify.com/api/v1/sites/${SITE_ID}/env" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"NEXT_PUBLIC_API_URL\",\"scopes\":[\"production\"],\"values\":[{\"value\":\"${API_URL}\",\"context\":\"production\"}]}" \
    2>/dev/null || echo "000")
fi

if [[ "$HTTP_CODE" != "200" ]] && [[ "$HTTP_CODE" != "201" ]]; then
  echo "Errore Netlify API (HTTP $HTTP_CODE). Installa netlify-cli o controlla token/site id."
  cat /tmp/netlify-env-out.json 2>/dev/null || true
  exit 1
fi

curl -sS -X POST "https://api.netlify.com/api/v1/sites/${SITE_ID}/builds" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"clear_cache":true}' >/dev/null

echo "OK (Netlify API). Deploy avviato per sito $SITE_ID"

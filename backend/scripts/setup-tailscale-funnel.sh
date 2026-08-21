#!/usr/bin/env bash
# Espone crm-api via Tailscale Funnel (URL .ts.net stabile) e allinea .env + Netlify.
# Uso: ./setup-tailscale-funnel.sh [FRONTEND_URL]
# Es:  ./setup-tailscale-funnel.sh https://nicoloservice.netlify.app
set -euo pipefail

CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
BACKEND="${CRM_ROOT}/backend"
ENV_FILE="$BACKEND/.env"
FRONTEND_URL="${1:-https://nicoloservice.netlify.app}"
FRONTEND_URL="${FRONTEND_URL%/}"

PORT=$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo "4100")

upsert_env() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >>"$ENV_FILE"
  fi
}

echo "==> Tailscale Funnel — CRM API su porta ${PORT}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Errore: $ENV_FILE non trovato"
  exit 1
fi

if ! command -v tailscale >/dev/null 2>&1; then
  echo "Tailscale non installato. Esegui:"
  echo "  curl -fsSL https://tailscale.com/install.sh | sh"
  exit 1
fi

if ! tailscale status >/dev/null 2>&1; then
  echo "Mint non collegato al tailnet. Esegui:"
  echo "  sudo tailscale up"
  echo "Poi autorizza il device dal link nel browser."
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "Errore: crm-api non risponde su 127.0.0.1:${PORT}"
  echo "  pm2 restart crm-api"
  exit 1
fi

echo "==> Rimuovo tunnel Cloudflare quick (crm-tunnel) se presente"
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete crm-tunnel 2>/dev/null || true
  pm2 save 2>/dev/null || true
fi

echo "==> Permessi Funnel per utente $(whoami) (una tantum)"
sudo tailscale set --operator="$(whoami)" 2>/dev/null || true

echo "==> Avvio Tailscale Funnel (--bg → localhost:${PORT} = Nicolò Service)"
echo "    Se Funnel non è abilitato sul tailnet, apri il link che compare e riprova."
# Non fare reset cieco: ripristina entrambe le regole (Service 443 + 3D 8443)
sudo tailscale funnel reset 2>/dev/null || true
FUNNEL_LOG=$(mktemp)
if ! sudo tailscale funnel --bg --yes "${PORT}" 2>"$FUNNEL_LOG"; then
  if grep -q 'login.tailscale.com/f/funnel' "$FUNNEL_LOG" 2>/dev/null; then
    echo ""
    echo "Apri nel browser (account nalettonicolo@github) e approva Funnel:"
    grep -oE 'https://login\.tailscale\.com/f/funnel[^[:space:]]*' "$FUNNEL_LOG" | head -1
    echo ""
    echo "Poi riesegui: $0 $FRONTEND_URL"
    rm -f "$FUNNEL_LOG"
    exit 1
  fi
  cat "$FUNNEL_LOG" >&2
  rm -f "$FUNNEL_LOG"
  exit 1
fi
rm -f "$FUNNEL_LOG"
sleep 2

# Ripristina Funnel Stampa 3D su :8443 → localhost:4101 se online
N3D_PORT=4101
N3D_HTTPS=8443
if curl -sf --max-time 3 "http://127.0.0.1:${N3D_PORT}/api/health" >/dev/null; then
  echo "==> Ripristino Funnel Nicolò-3D :${N3D_HTTPS} → :${N3D_PORT}"
  sudo tailscale funnel --bg --yes --https="${N3D_HTTPS}" "http://127.0.0.1:${N3D_PORT}" || true
else
  echo "==> Skip Funnel 3D (n3d non in ascolto su ${N3D_PORT})"
fi
sleep 2

FUNNEL_URL=""
if command -v jq >/dev/null 2>&1; then
  FUNNEL_URL=$(sudo tailscale funnel status --json 2>/dev/null | jq -r '
    .. | strings | select(test("^https://.*\\.ts\\.net$"))
  ' 2>/dev/null | head -1 || true)
fi
if [[ -z "$FUNNEL_URL" ]]; then
  FUNNEL_URL=$(sudo tailscale funnel status 2>/dev/null \
    | grep -oE 'https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.ts\.net' \
    | head -1 || true)
fi

if [[ -z "$FUNNEL_URL" ]]; then
  echo ""
  echo "URL Funnel non trovato automaticamente. Esegui:"
  echo "  tailscale funnel status"
  echo "Copia l'URL https://....ts.net e:"
  echo "  1. Aggiorna API_URL in $ENV_FILE"
  echo "  2. Netlify: NEXT_PUBLIC_API_URL=stesso URL"
  exit 1
fi

FUNNEL_URL="${FUNNEL_URL%/}"

echo "==> URL pubblico API: $FUNNEL_URL"

upsert_env "USE_TAILSCALE_FUNNEL" "true"
upsert_env "TAILSCALE_FUNNEL_URL" "$FUNNEL_URL"
upsert_env "API_URL" "$FUNNEL_URL"
upsert_env "FRONTEND_URL" "$FRONTEND_URL"
upsert_env "TRUST_CROSS_SITE_COOKIES" "true"
upsert_env "NODE_ENV" "production"

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart crm-api --update-env 2>/dev/null || true
fi

echo ""
echo "==> Healthcheck pubblico"
if curl -sf "${FUNNEL_URL}/api/health"; then
  echo ""
  echo "OK — API raggiungibile via Tailscale"
else
  echo ""
  echo "ATTENZIONE: health su $FUNNEL_URL fallito (DNS può richiedere ~10 min)."
  echo "  tailscale funnel status"
fi

if grep -qE '^NETLIFY_AUTH_TOKEN=' "$ENV_FILE" 2>/dev/null; then
  echo ""
  bash "$(dirname "$0")/sync-netlify-api-url.sh" "$BACKEND" || true
else
  echo ""
  echo "==> Netlify (manuale o da Windows)"
  echo "  NEXT_PUBLIC_API_URL=$FUNNEL_URL"
  echo "  .\\scripts\\netlify-aggiorna-api-url.ps1 \"$FUNNEL_URL\""
fi

echo ""
echo "Fatto. Frontend: $FRONTEND_URL"
echo "API:         $FUNNEL_URL"

#!/usr/bin/env bash
# Dopo aver avviato crm-tunnel (quick), estrae il nuovo URL e aggiorna .env API_URL.
set -euo pipefail

BACKEND="${1:-$HOME/CRM-APP/backend}"
ENV_FILE="$BACKEND/.env"

if ! pm2 describe crm-tunnel >/dev/null 2>&1; then
  echo "Errore: crm-tunnel non è in PM2. Esegui prima: ./scripts/ripristina-mint-pm2.sh"
  exit 1
fi

URL=$(pm2 logs crm-tunnel --lines 50 --nostream 2>/dev/null \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
  | tail -1)

if [[ -z "$URL" ]]; then
  echo "URL tunnel non trovato nei log. Esegui:"
  echo "  pm2 logs crm-tunnel"
  echo "Copia manualmente l'URL https://....trycloudflare.com"
  exit 1
fi

echo "URL tunnel trovato: $URL"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Errore: $ENV_FILE non trovato"
  exit 1
fi

if grep -q '^API_URL=' "$ENV_FILE"; then
  sed -i "s|^API_URL=.*|API_URL=$URL|" "$ENV_FILE"
else
  echo "API_URL=$URL" >> "$ENV_FILE"
fi

echo "Aggiornato $ENV_FILE"
grep '^API_URL=' "$ENV_FILE"

pm2 restart crm-api --update-env 2>/dev/null || true

echo ""
echo "Su Netlify imposta NEXT_PUBLIC_API_URL=$URL"
echo "Poi: Clear cache and deploy"
echo ""
curl -sf "${URL}/api/health" && echo "" || echo "Health esterno non ancora OK — attendi 10s e riprova"

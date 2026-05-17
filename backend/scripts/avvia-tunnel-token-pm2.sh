#!/usr/bin/env bash
# Avvia tunnel Cloudflare creato dal PANNELLO WEB (token eyJ...).
# Metti in ~/CRM-APP/backend/.env:  CLOUDFLARE_TUNNEL_TOKEN=eyJ...
# oppure:  export CLOUDFLARE_TUNNEL_TOKEN='eyJ...'  prima di eseguire questo script.
set -euo pipefail

BACKEND="${CRM_ROOT:-$HOME/CRM-APP}/backend"
ENV_FILE="$BACKEND/.env"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Installa cloudflared: sudo apt update && sudo apt install -y cloudflared"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installa pm2: npm install -g pm2"
  exit 1
fi

TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"
if [[ -z "$TOKEN" && -f "$ENV_FILE" ]]; then
  TOKEN=$(grep -E '^CLOUDFLARE_TUNNEL_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r"' | head -1)
fi

if [[ -z "$TOKEN" ]]; then
  echo "Token mancante."
  echo ""
  echo "1. Sul sito Cloudflare: Zero Trust → Reti → Tunnel → Installa connettore"
  echo "2. Copia la stringa eyJ... dal comando (tutto il token)"
  echo "3. Aggiungi in $ENV_FILE :"
  echo "   CLOUDFLARE_TUNNEL_TOKEN=eyJ..."
  echo "   oppure: export CLOUDFLARE_TUNNEL_TOKEN='eyJ...'"
  echo ""
  echo "Guida: ~/CRM-APP/docs/guida-tunnel-da-sito-cloudflare.md"
  exit 1
fi

PORT=$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo "4100")
if ! curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "ATTENZIONE: l'API non risponde su porta $PORT. Avvia prima crm-api."
  echo "  cd ~/CRM-APP/backend && pm2 start dist/index.js --name crm-api --cwd ~/CRM-APP/backend"
fi

echo "==> Avvio crm-tunnel (token da pannello Cloudflare)"
pm2 delete crm-tunnel 2>/dev/null || true
pm2 start cloudflared --name crm-tunnel -- tunnel run --token "$TOKEN"
pm2 save

echo ""
pm2 list
echo ""
echo "Tra 15 secondi controlla sul sito Cloudflare: connettore Healthy."
echo "Poi: curl -s https://api.TUO-DOMINIO.it/api/health"
echo "(API_URL in .env deve essere lo stesso hostname creato nel pannello)"

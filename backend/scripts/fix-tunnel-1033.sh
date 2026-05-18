#!/usr/bin/env bash
# Errore Cloudflare 1033: API_URL vecchio o tunnel quick disallineato.
# Ricrea crm-tunnel, aggiorna API_URL in .env, riavvia API, verifica health pubblico.
set -euo pipefail

BACKEND="${1:-$HOME/CRM-APP/backend}"
ENV_FILE="$BACKEND/.env"
PORT=$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo "4100")

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Errore: cloudflared non installato."
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "Errore: crm-api non risponde su porta ${PORT}. Avvia prima: pm2 restart crm-api"
  exit 1
fi

echo "==> Fermo tunnel vecchio (URL trycloudflare non più valido)"
pm2 delete crm-tunnel 2>/dev/null || true

echo "==> Nuovo tunnel veloce → http://127.0.0.1:${PORT}"
pm2 start cloudflared --name crm-tunnel -- tunnel --url "http://127.0.0.1:${PORT}"
sleep 8

echo "==> Aggiorna API_URL in .env"
bash "$BACKEND/scripts/aggiorna-url-tunnel.sh" "$BACKEND"

pm2 save

API_URL=$(grep -E '^API_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
echo ""
echo "==> Verifica"
if curl -sf "${API_URL}/api/health"; then
  echo ""
  echo "OK — tunnel attivo: $API_URL"
else
  echo ""
  echo "ATTENZIONE: health pubblico fallito. Log:"
  pm2 logs crm-tunnel --lines 30 --nostream
  exit 1
fi

echo ""
if grep -qE '^NETLIFY_AUTH_TOKEN=' "$ENV_FILE" 2>/dev/null; then
  bash "$BACKEND/scripts/sync-netlify-api-url.sh" "$BACKEND" || true
else
  echo "Su Netlify (obbligatorio se non usi sync automatico):"
  echo "  NEXT_PUBLIC_API_URL=$API_URL"
  echo "  Vedi docs/guida-api-stabile-senza-dominio.md (NETLIFY_AUTH_TOKEN)"
fi

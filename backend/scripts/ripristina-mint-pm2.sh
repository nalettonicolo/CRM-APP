#!/usr/bin/env bash
# Ripristina API + tunnel su Mint quando pm2 list è vuoto o tunnel Cloudflare 1033.
set -euo pipefail

CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
BACKEND="$CRM_ROOT/backend"
CONFIG="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"
PORT="${PORT:-4100}"
if [[ -f "$BACKEND/.env" ]]; then
  PORT=$(grep -E '^PORT=' "$BACKEND/.env" | cut -d= -f2 | tr -d '\r' || echo "$PORT")
fi

echo "==> CRM root: $CRM_ROOT"

if [[ ! -d "$BACKEND" ]]; then
  echo "Errore: cartella $BACKEND non trovata."
  exit 1
fi

cd "$BACKEND"

if [[ ! -f .env ]]; then
  echo "Errore: manca $BACKEND/.env"
  exit 1
fi

echo "==> Build API (se serve)"
if [[ ! -f dist/index.js ]]; then
  npm ci
  npm run build
fi

echo "==> Avvio crm-api"
pm2 delete crm-api 2>/dev/null || true
pm2 start dist/index.js --name crm-api --cwd "$BACKEND" --update-env

sleep 2
if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "    API OK su porta $PORT"
else
  echo "    ERRORE: API non risponde su http://127.0.0.1:${PORT}/api/health"
  echo "    Controlla PORT in .env e: pm2 logs crm-api --lines 40"
  exit 1
fi

echo "==> Avvio tunnel"
pm2 delete crm-tunnel 2>/dev/null || true

if [[ -f "$CONFIG" ]]; then
  echo "    Tunnel permanente ($CONFIG)"
  pm2 start cloudflared --name crm-tunnel -- \
    tunnel --config "$CONFIG" run
else
  echo "    Tunnel veloce (URL NUOVO a ogni avvio — leggi sotto)"
  pm2 start cloudflared --name crm-tunnel -- \
    tunnel --url "http://127.0.0.1:${PORT}"
  sleep 5
  echo ""
  echo "    >>> COPIA IL NUOVO URL HTTPS dai log (non usare vecchi trycloudflare):"
  pm2 logs crm-tunnel --lines 25 --nostream | grep -E 'https://.*trycloudflare' || true
fi

pm2 save

echo ""
pm2 list
echo ""
echo "==> Prossimi passi"
echo "1. pm2 startup   → esegui la riga sudo che stampa, poi: pm2 save"
echo "2. Se tunnel veloce: aggiorna API_URL in .env e NEXT_PUBLIC_API_URL su Netlify con il NUOVO URL"
echo "3. pm2 restart crm-api --update-env"
echo "4. curl -s https://TUO-NUOVO-URL/api/health"
echo ""
echo "Guida tunnel fisso: $CRM_ROOT/docs/guida-tunnel-permanente-pm2.md"

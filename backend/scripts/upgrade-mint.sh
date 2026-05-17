#!/usr/bin/env bash
# Esegui sul Mini PC (Mint), nella cartella del progetto.
set -euo pipefail

cd ~/CRM-APP

echo "==> Git pull"
git pull origin main

cd backend

echo "==> Schema database (nuove tabelle/colonne)"
npx prisma db push

if [[ "${RUN_DB_SEED:-}" == "1" ]]; then
  echo "==> Seed database (RUN_DB_SEED=1)"
  npx prisma db seed
fi

echo "==> Build API"
npm ci
npm run build

echo "==> Avvio / riavvio PM2 (crm-api)"
if pm2 describe crm-api >/dev/null 2>&1; then
  pm2 restart crm-api --update-env
else
  echo "    crm-api non presente — avvio nuovo processo"
  pm2 start dist/index.js --name crm-api --cwd "$(pwd)" --update-env
fi
pm2 save
pm2 status crm-api

PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo "4100")
if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "    Health locale OK (porta ${PORT})"
else
  echo "    ATTENZIONE: API non risponde su 127.0.0.1:${PORT} — vedi: pm2 logs crm-api"
fi

echo ""
echo "Fatto. Verifica tunnel Cloudflare (API_URL in .env) e Netlify NEXT_PUBLIC_API_URL."
echo "Tunnel permanente PM2: docs/guida-tunnel-permanente-pm2.md"
echo "  ~/CRM-APP/backend/scripts/setup-tunnel-pm2.sh"

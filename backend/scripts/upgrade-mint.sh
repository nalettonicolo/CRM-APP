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

echo "==> Riavvio PM2"
pm2 restart crm-api --update-env
pm2 status crm-api

echo ""
echo "Fatto. Verifica tunnel Cloudflare (API_URL in .env) e Netlify NEXT_PUBLIC_API_URL."

#!/usr/bin/env bash
# Build e avvio frontend Next.js su Mint (PM2: crm-web).
# Uso: ~/CRM-APP/backend/scripts/deploy-frontend-mint.sh
set -euo pipefail

CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
FRONTEND="$CRM_ROOT/frontend"
ENV_PROD="$FRONTEND/.env.production"
PORT="${FRONTEND_PORT:-3000}"

if [[ ! -d "$FRONTEND" ]]; then
  echo "Errore: $FRONTEND non trovato."
  exit 1
fi

if [[ ! -f "$ENV_PROD" ]]; then
  echo "Errore: crea $ENV_PROD (copia da frontend/.env.production.example)"
  echo "  NEXT_PUBLIC_API_URL=https://www.tuodominio.it"
  echo "  API_INTERNAL_URL=http://127.0.0.1:4100"
  exit 1
fi

echo "==> Frontend Mint — build (porta pubblica $PORT)"
cd "$CRM_ROOT"

if [[ ! -d node_modules ]] || [[ ! -d node_modules/next ]]; then
  echo "==> npm ci (monorepo)"
  npm ci --no-audit --no-fund
fi

set -a
# shellcheck disable=SC1090
source "$ENV_PROD"
set +a

export NODE_ENV=production
npm run build --workspace=crm-frontend

echo "==> PM2 crm-web"
pm2 delete crm-web 2>/dev/null || true
PORT="$PORT" pm2 start npm --name crm-web --cwd "$CRM_ROOT" -- \
  run start --workspace=crm-frontend -- -p "$PORT"
pm2 save

echo ""
echo "OK — frontend su http://127.0.0.1:${PORT}"
echo "Tunnel Cloudflare deve puntare a questa porta (es. www.tuodominio.it → :${PORT})"

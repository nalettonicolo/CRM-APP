#!/usr/bin/env bash
# Allinea backend/.env e frontend/.env.production per deploy autonomo (senza Netlify).
# Uso: ./configura-dominio-mint.sh https://www.tuodominio.it [porta-api]
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 https://www.tuodominio.it [4100]"
  echo "Esempio: $0 https://www.nicoloservice.it"
  exit 1
fi

SITE_URL="${1%/}"
API_PORT="${2:-4100}"
CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
BACKEND="$CRM_ROOT/backend"
FRONTEND="$CRM_ROOT/frontend"
ENV_BACKEND="$BACKEND/.env"
ENV_FRONTEND="$FRONTEND/.env.production"

if [[ ! -f "$ENV_BACKEND" ]]; then
  echo "Errore: manca $ENV_BACKEND"
  exit 1
fi

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  if grep -qE "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >>"$file"
  fi
}

upsert_env "$ENV_BACKEND" "NODE_ENV" "production"
upsert_env "$ENV_BACKEND" "PORT" "$API_PORT"
upsert_env "$ENV_BACKEND" "API_URL" "$SITE_URL"
upsert_env "$ENV_BACKEND" "FRONTEND_URL" "$SITE_URL"

# Stesso dominio → cookie SameSite=lax (no cross-site)
if grep -qE '^TRUST_CROSS_SITE_COOKIES=' "$ENV_BACKEND" 2>/dev/null; then
  sed -i 's/^TRUST_CROSS_SITE_COOKIES=.*/TRUST_CROSS_SITE_COOKIES=false/' "$ENV_BACKEND"
fi

cat >"$ENV_FRONTEND" <<EOF
# Generato da configura-dominio-mint.sh
NEXT_PUBLIC_API_URL=$SITE_URL
API_INTERNAL_URL=http://127.0.0.1:${API_PORT}
EOF

echo "OK"
echo "  backend:  API_URL=$SITE_URL"
echo "  backend:  FRONTEND_URL=$SITE_URL"
echo "  frontend: $ENV_FRONTEND"
echo ""
echo "Prossimi passi:"
echo "  1. ~/.cloudflared/config.yml → hostname $SITE_URL → http://127.0.0.1:3000"
echo "  2. ./backend/scripts/deploy-completo-mint.sh"

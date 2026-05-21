#!/usr/bin/env bash
# Esegui sul Mini PC (Mint), nella cartella del progetto.
set -euo pipefail

CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
BACKEND="${CRM_ROOT}/backend"

cd "$CRM_ROOT"

if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  echo "==> Git pull"
  if ! git pull origin main; then
    echo "    Conflitto su script: ripristino backend/scripts/ da repository"
    git checkout -- backend/scripts/ 2>/dev/null || true
    git pull origin main
  fi
fi

if [[ ! -f "$BACKEND/.env" ]]; then
  echo "Errore: $BACKEND/.env mancante (copia da .env.example e imposta DATABASE_URL)"
  exit 1
fi

# Valori con spazi (SMTP_PASS, SMTP_FROM_NAME, …) devono essere tra virgolette
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" ]] && continue
  if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*=([^\"\']).*[[:space:]] ]]; then
    echo "Errore: in $BACKEND/.env c'è un valore con spazi ma senza virgolette:"
    echo "  $line"
    echo "  Esempio: SMTP_FROM_NAME=\"Nicolò Service\""
    exit 1
  fi
done < "$BACKEND/.env"

# Prisma legge DATABASE_URL dall'ambiente — senza source .env fallisce con P1012
set -a
# shellcheck disable=SC1091
source "$BACKEND/.env"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Errore: DATABASE_URL vuoto in $BACKEND/.env"
  exit 1
fi

echo "==> Cartelle upload (logo, galleria, allegati)"
UPLOAD_DIR_RESOLVED="${UPLOAD_DIR:-./uploads}"
if [[ "$UPLOAD_DIR_RESOLVED" != /* ]]; then
  UPLOAD_DIR_RESOLVED="$BACKEND/$UPLOAD_DIR_RESOLVED"
fi
UPLOAD_DIR_RESOLVED="$(cd "$(dirname "$UPLOAD_DIR_RESOLVED")" 2>/dev/null && pwd)/$(basename "$UPLOAD_DIR_RESOLVED")"
mkdir -p "$UPLOAD_DIR_RESOLVED/branding" "$UPLOAD_DIR_RESOLVED/gallery" "$UPLOAD_DIR_RESOLVED/attachments"
echo "    $UPLOAD_DIR_RESOLVED"

echo "==> Install dipendenze (root monorepo — include @types per tsc)"
NPM_CI_FLAGS=()
if [[ "${NODE_ENV:-}" == "production" ]]; then
  NPM_CI_FLAGS=(--include=dev)
  echo "    NODE_ENV=production: forzo installazione devDependencies"
fi
npm ci "${NPM_CI_FLAGS[@]}"

if [[ ! -d "$CRM_ROOT/node_modules/@types/node" ]]; then
  echo "Errore: @types/node mancante dopo npm ci. Dalla root: cd $CRM_ROOT && npm ci"
  exit 1
fi

echo "==> Schema database (nuove tabelle/colonne)"
(
  cd "$BACKEND"
  npx prisma db push --schema=prisma/schema.prisma
  if [[ "${RUN_DB_SEED:-}" == "1" ]]; then
    echo "==> Seed database (RUN_DB_SEED=1)"
    npx prisma db seed
  fi
)

echo "==> Build API (dalla root monorepo — non da backend/)"
cd "$CRM_ROOT"
if [[ ! -f "$CRM_ROOT/package.json" ]] || ! grep -q '"workspaces"' "$CRM_ROOT/package.json" 2>/dev/null; then
  echo "Errore: esegui lo script dalla root del repo ($CRM_ROOT), non solo la cartella backend."
  echo "  cd $CRM_ROOT && bash backend/scripts/upgrade-mint.sh"
  exit 1
fi
npm run build --workspace=backend

echo "==> Avvio / riavvio PM2 (crm-api)"
if pm2 describe crm-api >/dev/null 2>&1; then
  pm2 restart crm-api --update-env
else
  echo "    crm-api non presente — avvio nuovo processo"
  pm2 start dist/index.js --name crm-api --cwd "$BACKEND" --update-env
fi
pm2 save
pm2 status crm-api

PORT=$(grep -E '^PORT=' "$BACKEND/.env" 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo "4100")
sleep 2
health_ok=0
for _ in 1 2 3 4 5; do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
    health_ok=1
    break
  fi
  sleep 2
done
if [[ "$health_ok" == "1" ]]; then
  echo "    Health locale OK (porta ${PORT})"
else
  echo "    ATTENZIONE: API non risponde su 127.0.0.1:${PORT} — vedi: pm2 logs crm-api --lines 40"
fi

echo ""
echo "Fatto. Verifica tunnel Cloudflare (API_URL in .env) e Netlify NEXT_PUBLIC_API_URL."
echo "Tunnel permanente PM2: docs/guida-tunnel-permanente-pm2.md"
echo "  ~/CRM-APP/backend/scripts/setup-tunnel-pm2.sh"

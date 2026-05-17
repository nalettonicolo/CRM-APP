#!/usr/bin/env bash
# Deploy completo sul Mint: pull, schema DB, build API, PM2 (api + tunnel), healthcheck.
# Uso: ~/CRM-APP/backend/scripts/deploy-completo-mint.sh
#      SKIP_PULL=1 ...   (se git pull già fatto, es. da GitHub Actions)
set -euo pipefail

CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
BACKEND="$CRM_ROOT/backend"
CONFIG="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"

echo "==> Deploy completo Mint — $CRM_ROOT"

if [[ ! -d "$BACKEND" ]]; then
  echo "Errore: $BACKEND non trovato."
  exit 1
fi

if [[ ! -f "$BACKEND/.env" ]]; then
  echo "Errore: crea $BACKEND/.env (copia da .env.example)"
  exit 1
fi

if [[ "${SKIP_PULL:-0}" != "1" ]] && [[ -d "$CRM_ROOT/.git" ]]; then
  echo "==> Git pull"
  git -C "$CRM_ROOT" pull origin main
fi

chmod +x "$BACKEND/scripts/"*.sh 2>/dev/null || true

echo "==> API (upgrade-mint)"
bash "$BACKEND/scripts/upgrade-mint.sh"

PORT=$(grep -E '^PORT=' "$BACKEND/.env" 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo "4100")

echo "==> Tunnel Cloudflare"
if [[ -f "$CONFIG" ]]; then
  if pm2 describe crm-tunnel >/dev/null 2>&1; then
    pm2 restart crm-tunnel --update-env
    echo "    Tunnel permanente riavviato"
  else
    bash "$BACKEND/scripts/setup-tunnel-pm2.sh"
  fi
elif pm2 describe crm-tunnel >/dev/null 2>&1; then
  echo "    Tunnel veloce: ricreo (evita errore 1033 con URL vecchio in .env)"
  pm2 delete crm-tunnel 2>/dev/null || true
  pm2 start cloudflared --name crm-tunnel -- tunnel --url "http://127.0.0.1:${PORT}"
  sleep 8
  bash "$BACKEND/scripts/aggiorna-url-tunnel.sh" "$BACKEND" || true
else
  echo "    Avvio tunnel veloce trycloudflare (senza dominio)"
  pm2 start cloudflared --name crm-tunnel -- tunnel --url "http://127.0.0.1:${PORT}"
  sleep 6
  if bash "$BACKEND/scripts/aggiorna-url-tunnel.sh" "$BACKEND"; then
    echo "    API_URL aggiornato in .env"
  else
    echo "    >>> Copia l'URL dai log e aggiorna .env + Netlify:"
    pm2 logs crm-tunnel --lines 25 --nostream | grep -E 'https://.*trycloudflare' || true
  fi
fi

pm2 save

API_URL=$(grep -E '^API_URL=' "$BACKEND/.env" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)

echo ""
echo "==> Healthcheck"
curl -sf "http://127.0.0.1:${PORT}/api/health"
echo " — locale OK"

if [[ -n "$API_URL" ]] && [[ "$API_URL" == https://* ]]; then
  if curl -sf "${API_URL}/api/health"; then
    echo " — pubblico OK ($API_URL)"
  else
    echo ""
    echo "ATTENZIONE: $API_URL non risponde ancora."
    echo "  Se hai riavviato il tunnel veloce, l'URL può essere cambiato:"
    echo "  bash $BACKEND/scripts/aggiorna-url-tunnel.sh"
    echo "  pm2 logs crm-tunnel --lines 30"
  fi
fi

echo ""
pm2 list
echo ""
echo "==> Netlify (obbligatorio se API_URL è cambiato)"
echo "  NEXT_PUBLIC_API_URL=${API_URL:-<stesso valore di API_URL nel .env>}"
echo "  Deploys → Clear cache and deploy site"
echo ""
echo "==> Boot automatico (una volta)"
echo "  pm2 startup   # poi esegui la riga sudo, poi: pm2 save"

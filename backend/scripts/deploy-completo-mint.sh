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
  if ! git -C "$CRM_ROOT" pull origin main; then
    echo "    Conflitto su script di deploy: uso versione da repository"
    git -C "$CRM_ROOT" checkout -- backend/scripts/upgrade-mint.sh backend/scripts/deploy-completo-mint.sh 2>/dev/null || true
    git -C "$CRM_ROOT" pull origin main
  fi
fi

chmod +x "$BACKEND/scripts/"*.sh 2>/dev/null || true
chmod +x "$BACKEND/scripts/deploy-completo-mint.sh" 2>/dev/null || true

echo "==> API (upgrade-mint)"
SKIP_PULL=1 CRM_ROOT="$CRM_ROOT" bash "$BACKEND/scripts/upgrade-mint.sh"

if [[ -f "$CRM_ROOT/frontend/.env.production" ]] && [[ "${SKIP_FRONTEND:-0}" != "1" ]]; then
  echo "==> Frontend (crm-web)"
  bash "$BACKEND/scripts/deploy-frontend-mint.sh"
else
  echo "==> Frontend: saltato (manca frontend/.env.production o SKIP_FRONTEND=1)"
  echo "    Deploy autonomo: vedi docs/guida-deploy-autonomo-mint-dominio.md"
fi

PORT=$(grep -E '^PORT=' "$BACKEND/.env" 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo "4100")
USE_TS=$(grep -E '^USE_TAILSCALE_FUNNEL=' "$BACKEND/.env" 2>/dev/null | cut -d= -f2 | tr -d '\r' || true)
[[ "${USE_TAILSCALE_FUNNEL:-0}" == "1" ]] && USE_TS=true

if [[ "$USE_TS" == "true" ]] || [[ "${USE_TAILSCALE_FUNNEL:-}" == "true" ]]; then
  echo "==> Esposizione API: Tailscale Funnel (nessun Cloudflare tunnel)"
  if ! tailscale funnel status 2>/dev/null | grep -qE '\.ts\.net'; then
    echo "    Funnel non attivo. Esegui: ./backend/scripts/setup-tailscale-funnel.sh"
  else
    TS_URL=$(grep -E '^TAILSCALE_FUNNEL_URL=' "$BACKEND/.env" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)
    echo "    URL: ${TS_URL:-vedi: tailscale funnel status}"
  fi
elif [[ -f "$CONFIG" ]]; then
echo "==> Tunnel Cloudflare"
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
FRONTEND_URL=$(grep -E '^FRONTEND_URL=' "$BACKEND/.env" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)
echo ""
if [[ -n "$FRONTEND_URL" ]] && [[ "$FRONTEND_URL" != *netlify.app* ]]; then
  echo "==> Sito pubblico (autonomo): $FRONTEND_URL"
  echo "  Tunnel: hostname → http://127.0.0.1:3000 (crm-web)"
elif [[ -n "$API_URL" ]]; then
  echo "==> Se usi ancora Netlify:"
  echo "  NEXT_PUBLIC_API_URL=$API_URL"
  echo "  Altrimenti: docs/guida-deploy-autonomo-mint-dominio.md"
fi
echo ""
echo "==> Boot automatico (una volta)"
echo "  pm2 startup   # poi esegui la riga sudo, poi: pm2 save"

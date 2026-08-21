#!/usr/bin/env bash
# Watchdog Mint: se l'API (o il tunnel) non risponde, riavvio completo PM2.
# Uso:
#   bash backend/scripts/watchdog-mint.sh           # un controllo + eventuale restart
#   bash backend/scripts/watchdog-mint.sh --loop    # ogni 60s
# Cron consigliato (ogni 2 min):
#   */2 * * * * CRM_ROOT=$HOME/CRM-APP bash $HOME/CRM-APP/backend/scripts/watchdog-mint.sh >>$HOME/CRM-APP/logs/watchdog-mint.log 2>&1

set -u

CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
BACKEND="$CRM_ROOT/backend"
PORT="${PORT:-4100}"
LOOP=0
INTERVAL="${WATCHDOG_INTERVAL:-60}"
LOG_DIR="$CRM_ROOT/logs"
mkdir -p "$LOG_DIR"

if [[ "${1:-}" == "--loop" ]]; then
  LOOP=1
fi

if [[ -f "$BACKEND/.env" ]]; then
  PORT=$(grep -E '^PORT=' "$BACKEND/.env" | cut -d= -f2 | tr -d '\r' || echo "$PORT")
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

api_ok() {
  curl -sf --max-time 5 "http://127.0.0.1:${PORT}/api/health" >/dev/null
}

tunnel_ok() {
  # Se non c'è processo tunnel, non è obbligatorio (API locale può bastare)
  if ! pm2 describe crm-tunnel >/dev/null 2>&1; then
    return 0
  fi
  # Online in pm2 list
  pm2 jlist 2>/dev/null | grep -q '"name":"crm-tunnel".*"status":"online"' && return 0
  return 1
}

full_restart() {
  log "RIAVVIO COMPLETO Mint (crm-api + tunnel se presente)"
  if [[ -x "$BACKEND/scripts/ripristina-mint-pm2.sh" ]]; then
    bash "$BACKEND/scripts/ripristina-mint-pm2.sh" || true
    return
  fi
  if [[ -x "$BACKEND/scripts/upgrade-mint.sh" ]]; then
    bash "$BACKEND/scripts/upgrade-mint.sh" || true
    return
  fi
  cd "$BACKEND" || return 1
  pm2 restart crm-api --update-env || pm2 start dist/index.js --name crm-api --cwd "$BACKEND" --update-env
  if pm2 describe crm-tunnel >/dev/null 2>&1; then
    pm2 restart crm-tunnel --update-env || true
  fi
  pm2 save || true
}

check_once() {
  local ok=1
  if api_ok; then
    log "API OK :${PORT}"
  else
    log "API DOWN :${PORT}"
    ok=0
  fi
  if tunnel_ok; then
    log "Tunnel OK (o non configurato)"
  else
    log "Tunnel DOWN"
    ok=0
  fi
  if [[ "$ok" -eq 0 ]]; then
    full_restart
    sleep 5
    if api_ok; then
      log "Dopo restart: API OK"
    else
      log "Dopo restart: API ancora DOWN — vedi pm2 logs crm-api --lines 40"
    fi
  fi
}

if [[ "$LOOP" -eq 1 ]]; then
  log "Watchdog Mint in loop (ogni ${INTERVAL}s)"
  while true; do
    check_once
    sleep "$INTERVAL"
  done
else
  check_once
fi

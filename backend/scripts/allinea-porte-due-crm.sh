#!/usr/bin/env bash
# Allinea porte + Funnel per entrambi i CRM sul Mint.
# Nicolò Service → :4100 → https://HOST.ts.net
# Nicolò-3D     → :4101 → https://HOST.ts.net:8443
#
# Uso: bash ~/CRM-APP/backend/scripts/allinea-porte-due-crm.sh
set -euo pipefail

CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
CRM_BACKEND="$CRM_ROOT/backend"
CRM_PORT=4100
N3D_PORT=4101
N3D_HTTPS=8443

# Possibili path Stampa 3D sul Mint
N3D_CANDIDATES=(
  "${N3D_ROOT:-}"
  "$HOME/nicolo-3d"
  "$HOME/CRM-Stampa-3D"
  "$HOME/crm-stampa-3d"
  "$HOME/Nicolò-3D"
  "$HOME/n3d"
)

find_n3d() {
  local d
  for d in "${N3D_CANDIDATES[@]}"; do
    [[ -z "$d" ]] && continue
    if [[ -f "$d/backend/dist/index.js" ]]; then echo "$d/backend"; return; fi
    if [[ -f "$d/dist/index.js" ]]; then echo "$d"; return; fi
    if [[ -f "$d/backend/package.json" ]]; then echo "$d/backend"; return; fi
  done
  # Da PM2
  if command -v pm2 >/dev/null 2>&1 && pm2 describe n3d-api >/dev/null 2>&1; then
    pm2 prettylist 2>/dev/null | python3 - <<'PY' 2>/dev/null || true
import json,sys,re
try:
  raw=sys.stdin.read()
except Exception:
  pass
PY
    local cwd
    cwd=$(pm2 show n3d-api 2>/dev/null | awk -F'│' '/exec cwd/ {gsub(/ /,"",$2); print $2}' | tr -d ' ')
    if [[ -n "$cwd" && -d "$cwd" ]]; then echo "$cwd"; return; fi
  fi
  return 1
}

upsert_env() {
  local file="$1" key="$2" value="$3"
  if [[ ! -f "$file" ]]; then
    echo "${key}=${value}" >"$file"
    return
  fi
  if grep -qE "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >>"$file"
  fi
}

echo "============================================"
echo " Allinea porte CRM — Service :${CRM_PORT} | 3D :${N3D_PORT}"
echo "============================================"

if [[ ! -d "$CRM_BACKEND" ]]; then
  echo "Errore: $CRM_BACKEND non trovato"
  exit 1
fi

# --- 1) Stampa 3D su 4101 ---
N3D_BACKEND="$(find_n3d || true)"
if [[ -n "${N3D_BACKEND:-}" ]]; then
  echo "==> Stampa 3D trovato: $N3D_BACKEND"
  upsert_env "$N3D_BACKEND/.env" "PORT" "$N3D_PORT"
  if [[ ! -f "$N3D_BACKEND/dist/index.js" ]]; then
    echo "    Build n3d…"
    (cd "$N3D_BACKEND" && npm ci --no-audit --no-fund && npx prisma generate && npm run build) || true
  fi
  if command -v pm2 >/dev/null 2>&1; then
    pm2 delete n3d-api 2>/dev/null || true
    fuser -k "${N3D_PORT}/tcp" 2>/dev/null || true
    sleep 1
    PORT="$N3D_PORT" pm2 start dist/index.js --name n3d-api --cwd "$N3D_BACKEND" --update-env
  fi
else
  echo "==> Stampa 3D: cartella non trovata."
  echo "    Se n3d-api è in PM2, imposta a mano PORT=${N3D_PORT} nel suo .env e:"
  echo "      PORT=${N3D_PORT} pm2 restart n3d-api --update-env"
fi

# --- 2) Nicolò Service su 4100 ---
echo "==> Nicolò Service → PORT=${CRM_PORT}"
cd "$CRM_ROOT"
git pull origin main || true
upsert_env "$CRM_BACKEND/.env" "PORT" "$CRM_PORT"
chmod +x "$CRM_BACKEND/scripts/"*.sh 2>/dev/null || true

if [[ ! -f "$CRM_BACKEND/dist/index.js" ]] || ! grep -q 'nicolo-service-crm' "$CRM_BACKEND/dist/app.js" 2>/dev/null; then
  echo "    Build CRM APP…"
  (cd "$CRM_BACKEND" && npm ci --no-audit --no-fund && npx prisma generate && npm run build)
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete crm-api 2>/dev/null || true
  fuser -k "${CRM_PORT}/tcp" 2>/dev/null || true
  sleep 1
  PORT="$CRM_PORT" pm2 start dist/index.js --name crm-api --cwd "$CRM_BACKEND" --update-env
  pm2 save
fi

sleep 3
echo ""
echo "==> Health locale"
echo -n "  :${CRM_PORT} Service: "
curl -sS --max-time 4 "http://127.0.0.1:${CRM_PORT}/api/health" || echo "FAIL"
echo ""
echo -n "  :${N3D_PORT} Stampa3D: "
curl -sS --max-time 4 "http://127.0.0.1:${N3D_PORT}/api/health" || echo "(offline o non installato)"
echo ""

CRM_HEALTH=$(curl -sS --max-time 4 "http://127.0.0.1:${CRM_PORT}/api/health" || true)
if echo "$CRM_HEALTH" | grep -q 'crm-stampa3d-api'; then
  echo "ERRORE: sulla ${CRM_PORT} c'è ancora Stampa 3D. Ferma n3d-api o cambia la sua PORT."
  pm2 list
  exit 1
fi
if ! echo "$CRM_HEALTH" | grep -qE 'nicolo-service-crm|"status":"ok"'; then
  echo "ERRORE: CRM Service non risponde correttamente sulla ${CRM_PORT}"
  pm2 logs crm-api --lines 30 --nostream || true
  exit 1
fi

# --- 3) Tailscale Funnel: 443→4100 e 8443→4101 ---
if command -v tailscale >/dev/null 2>&1; then
  echo "==> Tailscale Funnel"
  sudo tailscale set --operator="$(whoami)" 2>/dev/null || true
  # Reset pulito poi entrambe le regole (ordine: Service prima, poi 3D)
  sudo tailscale funnel reset 2>/dev/null || true
  sleep 1
  # Nicolò Service su HTTPS 443 → localhost:4100
  sudo tailscale funnel --bg --yes "${CRM_PORT}"
  sleep 1
  # Stampa 3D su HTTPS 8443 → localhost:4101 (se online)
  if curl -sf --max-time 3 "http://127.0.0.1:${N3D_PORT}/api/health" >/dev/null; then
    sudo tailscale funnel --bg --yes --https="${N3D_HTTPS}" "http://127.0.0.1:${N3D_PORT}"
  else
    echo "    Skip Funnel :${N3D_HTTPS} (n3d non in ascolto su ${N3D_PORT})"
  fi
  sleep 2
  sudo tailscale funnel status || true

  HOST=$(tailscale status --json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin).get("Self",{}).get("DNSName","").rstrip("."))' 2>/dev/null || true)
  if [[ -n "$HOST" ]]; then
    upsert_env "$CRM_BACKEND/.env" "API_URL" "https://${HOST}"
    upsert_env "$CRM_BACKEND/.env" "TAILSCALE_FUNNEL_URL" "https://${HOST}"
    upsert_env "$CRM_BACKEND/.env" "USE_TAILSCALE_FUNNEL" "true"
    upsert_env "$CRM_BACKEND/.env" "TRUST_CROSS_SITE_COOKIES" "true"
    if [[ -n "${N3D_BACKEND:-}" ]]; then
      upsert_env "$N3D_BACKEND/.env" "API_URL" "https://${HOST}:${N3D_HTTPS}"
      upsert_env "$N3D_BACKEND/.env" "TAILSCALE_FUNNEL_URL" "https://${HOST}:${N3D_HTTPS}"
      upsert_env "$N3D_BACKEND/.env" "PORT" "$N3D_PORT"
      upsert_env "$N3D_BACKEND/.env" "USE_TAILSCALE_FUNNEL" "true"
    fi
    pm2 restart crm-api --update-env 2>/dev/null || true
    pm2 restart n3d-api --update-env 2>/dev/null || true
    echo ""
    echo "==> Health pubblico"
    echo -n "  Service 443: "
    curl -sS --max-time 8 "https://${HOST}/api/health" || echo FAIL
    echo ""
    echo -n "  Stampa 8443: "
    curl -sS --max-time 8 "https://${HOST}:${N3D_HTTPS}/api/health" || echo "(skip)"
    echo ""
  fi
else
  echo "Tailscale non installato — solo porte locali allineate."
fi

pm2 save 2>/dev/null || true
pm2 list
echo ""
echo "OK atteso:"
echo "  curl -s https://HOST.ts.net/api/health       → nicolo-service-crm"
echo "  curl -s https://HOST.ts.net:8443/api/health  → crm-stampa3d-api"
echo "Netlify NEXT_PUBLIC_API_URL = https://HOST.ts.net  (SENZA :8443)"

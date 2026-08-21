#!/usr/bin/env bash
# Sistema conflitto porta 4100: Stampa 3D (n3d-api) vs Nicolò Service (crm-api).
# Uso sul Mint: bash ~/CRM-APP/backend/scripts/fix-porta-conflitto-stampa3d.sh
set -euo pipefail

CRM_ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
BACKEND="$CRM_ROOT/backend"
N3D_PORT="${N3D_PORT:-4101}"
CRM_PORT="${CRM_PORT:-4100}"

echo "==> Diagnosi porte / PM2"
pm2 list || true
echo ""
echo "Chi ascolta ${CRM_PORT} / ${N3D_PORT}:"
ss -tlnp 2>/dev/null | grep -E ":${CRM_PORT}|:${N3D_PORT}" || \
  netstat -tlnp 2>/dev/null | grep -E ":${CRM_PORT}|:${N3D_PORT}" || true

echo ""
echo "Health attuale :${CRM_PORT}"
curl -sS --max-time 3 "http://127.0.0.1:${CRM_PORT}/api/health" || echo "(nessuna risposta)"
echo ""

if [[ ! -f "$BACKEND/dist/index.js" ]]; then
  echo "==> Build CRM APP (manca dist/)"
  cd "$BACKEND"
  npm ci --no-audit --no-fund
  npx prisma generate
  npm run build
fi

# Assicura PORT=4100 nel .env di Nicolò Service
if [[ -f "$BACKEND/.env" ]]; then
  if grep -qE '^PORT=' "$BACKEND/.env"; then
    sed -i "s/^PORT=.*/PORT=${CRM_PORT}/" "$BACKEND/.env"
  else
    echo "PORT=${CRM_PORT}" >> "$BACKEND/.env"
  fi
  echo "==> $BACKEND/.env → PORT=${CRM_PORT}"
fi

echo "==> Sposta n3d-api su porta ${N3D_PORT} (se presente)"
if pm2 describe n3d-api >/dev/null 2>&1; then
  # Prova a riavviare con env PORT (funziona se l'app legge process.env.PORT)
  pm2 delete n3d-api 2>/dev/null || true
  # Cerca cartella tipica Stampa 3D
  N3D_DIR=""
  for d in "$HOME/CRM-Stampa-3D" "$HOME/crm-stampa-3d" "$HOME/CRM_Stampa_3D" "$HOME/n3d" "$HOME/Stampa3D"; do
    if [[ -f "$d/backend/dist/index.js" ]]; then N3D_DIR="$d/backend"; break; fi
    if [[ -f "$d/dist/index.js" ]]; then N3D_DIR="$d"; break; fi
  done
  if [[ -n "$N3D_DIR" ]]; then
    if [[ -f "$N3D_DIR/.env" ]]; then
      if grep -qE '^PORT=' "$N3D_DIR/.env"; then
        sed -i "s/^PORT=.*/PORT=${N3D_PORT}/" "$N3D_DIR/.env"
      else
        echo "PORT=${N3D_PORT}" >> "$N3D_DIR/.env"
      fi
    fi
    PORT="$N3D_PORT" pm2 start "$N3D_DIR/dist/index.js" --name n3d-api --cwd "$N3D_DIR" --update-env
    echo "    n3d-api riavviato da $N3D_DIR sulla ${N3D_PORT}"
  else
    echo "    ATTENZIONE: cartella Stampa 3D non trovata automaticamente."
    echo "    Riavvia n3d-api a mano con PORT=${N3D_PORT}, es.:"
    echo "      cd ~/PERCORSO-STAMPA3D && PORT=${N3D_PORT} pm2 start dist/index.js --name n3d-api --cwd \$PWD --update-env"
  fi
else
  echo "    n3d-api non in PM2 (ok)"
fi

echo "==> Riavvia crm-api da $BACKEND (Nicolò Service)"
pm2 delete crm-api 2>/dev/null || true
# Libera eventuali processi zombie sulla porta
fuser -k "${CRM_PORT}/tcp" 2>/dev/null || true
sleep 1
cd "$BACKEND"
git -C "$CRM_ROOT" pull origin main || true
npx prisma generate
npm run build
PORT="$CRM_PORT" pm2 start dist/index.js --name crm-api --cwd "$BACKEND" --update-env
pm2 save

sleep 3
echo ""
echo "==> Health CRM (deve contenere nicolo-service-crm o status:ok + features)"
HEALTH=$(curl -sS --max-time 5 "http://127.0.0.1:${CRM_PORT}/api/health" || true)
echo "$HEALTH"

if echo "$HEALTH" | grep -q 'crm-stampa3d-api'; then
  echo ""
  echo "ERRORE: sulla ${CRM_PORT} gira ancora Stampa 3D."
  echo "  pm2 show crm-api | grep -E 'cwd|script|exec'"
  echo "  ss -tlnp | grep ${CRM_PORT}"
  exit 1
fi

if ! echo "$HEALTH" | grep -qE 'nicolo-service-crm|"status":"ok"'; then
  echo "ATTENZIONE: health inatteso. Controlla: pm2 logs crm-api --lines 40"
  exit 1
fi

echo ""
echo "==> Tailscale Funnel → ${CRM_PORT}"
if command -v tailscale >/dev/null 2>&1; then
  sudo tailscale funnel reset 2>/dev/null || true
  sudo tailscale funnel --bg --yes "${CRM_PORT}"
  sleep 2
  sudo tailscale funnel status || true
  TS_URL=$(grep -E '^TAILSCALE_FUNNEL_URL=' "$BACKEND/.env" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)
  PUB="${TS_URL:-https://servercasanaletto.tail4fb76e.ts.net}"
  echo "Health pubblico:"
  curl -sS --max-time 8 "${PUB}/api/health" || true
  echo ""
fi

pm2 list
echo ""
echo "OK se health mostra nicolo-service-crm (non crm-stampa3d-api)."
echo "Poi riprova login su https://nicoloservice.netlify.app"

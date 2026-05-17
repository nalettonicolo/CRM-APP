#!/usr/bin/env bash
# Tunnel Cloudflare permanente in PM2 + salvataggio processi.
# Esegui sul Mint DOPO aver creato ~/.cloudflared/config.yml (vedi docs/guida-tunnel-permanente-pm2.md)
set -euo pipefail

CONFIG="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"
API_PORT="${API_PORT:-4100}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Errore: cloudflared non installato."
  echo "  sudo mkdir -p --mode=0755 /usr/share/keyrings"
  echo "  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null"
  echo "  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list"
  echo "  sudo apt update && sudo apt install -y cloudflared"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Errore: pm2 non installato. Installa con: npm install -g pm2"
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "Errore: manca $CONFIG"
  echo "Segui docs/guida-tunnel-permanente-pm2.md (passi 1–4) prima di questo script."
  exit 1
fi

echo "==> Verifica API locale sulla porta $API_PORT"
if curl -sf "http://127.0.0.1:${API_PORT}/api/health" >/dev/null; then
  echo "    API OK"
else
  echo "    ATTENZIONE: API non risponde su 127.0.0.1:${API_PORT}"
  echo "    Avvia prima: pm2 start ... crm-api  oppure controlla PORT nel .env"
fi

echo "==> Ferma tunnel quick / vecchio crm-tunnel (se presente)"
pm2 delete crm-tunnel 2>/dev/null || true

echo "==> Avvia tunnel permanente in PM2"
pm2 start cloudflared --name crm-tunnel -- \
  tunnel --config "$CONFIG" run

pm2 save

echo ""
echo "==> Stato PM2"
pm2 list

echo ""
echo "==> Prossimo passo OBBLIGATORIO (una sola volta, dopo reboot)"
echo "Esegui il comando che PM2 stampa con:"
echo "  pm2 startup"
echo "Poi incolla ed esegui la riga sudo che appare, infine:"
echo "  pm2 save"
echo ""
echo "Guida completa: ~/CRM-APP/docs/guida-tunnel-permanente-pm2.md"

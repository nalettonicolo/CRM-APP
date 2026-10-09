#!/usr/bin/env bash
# Una tantum sul Mint (terminale locale o SSH interattivo):
#   bash ~/CRM-APP/backend/scripts/abilita-sudo-nopasswd-mint.sh
#
# Chiede la password sudo UNA volta, poi:
#  - NOPASSWD per tailscale / Funnel / pm2-related comuni
#  - tailscale set --operator=$USER (Funnel senza sudo dove possibile)
#  - riabilita Funnel 443→4100 e 8443→4101
set -euo pipefail

USER_NAME="$(whoami)"
SUDOERS_FILE="/etc/sudoers.d/99-${USER_NAME}-crm"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Esegui come utente normale (es. nicolo), non come root."
  exit 1
fi

echo "==> Configuro sudo senza password per operazioni CRM/Tailscale"
echo "    (ti chiederà la password sudo una volta)"

TMP="$(mktemp)"
cat >"$TMP" <<EOF
# CRM APP / Nicolò Service — Mint
# Generato da abilita-sudo-nopasswd-mint.sh
${USER_NAME} ALL=(ALL) NOPASSWD: /usr/bin/tailscale, /usr/sbin/tailscale
${USER_NAME} ALL=(root) NOPASSWD: /usr/bin/tailscale, /usr/sbin/tailscale
${USER_NAME} ALL=(ALL) NOPASSWD: /bin/systemctl restart tailscaled, /bin/systemctl status tailscaled, /bin/systemctl start tailscaled
${USER_NAME} ALL=(postgres) NOPASSWD: /usr/bin/psql
EOF

sudo install -m 440 "$TMP" "$SUDOERS_FILE"
rm -f "$TMP"
sudo visudo -cf "$SUDOERS_FILE"

echo "==> Verifica NOPASSWD"
if sudo -n true 2>/dev/null; then
  echo "    sudo -n OK (NOPASSWD ampio già presente)"
else
  echo "    sudo generico ancora chiede password (ok): NOPASSWD solo su tailscale/psql"
fi
sudo -n tailscale status >/dev/null
echo "    sudo -n tailscale OK"

echo "==> Operatore Tailscale = $USER_NAME"
sudo -n tailscale set --operator="$USER_NAME" || sudo tailscale set --operator="$USER_NAME"

CRM_PORT=4100
N3D_PORT=4101
N3D_HTTPS=8443

echo "==> Funnel Service :443 → :${CRM_PORT}"
if curl -sf --max-time 3 "http://127.0.0.1:${CRM_PORT}/api/health" >/dev/null; then
  sudo -n tailscale funnel --bg --yes "${CRM_PORT}" || true
else
  echo "    ATTENZIONE: crm-api non risponde su ${CRM_PORT}"
fi

echo "==> Funnel Stampa3D :${N3D_HTTPS} → :${N3D_PORT}"
if curl -sf --max-time 3 "http://127.0.0.1:${N3D_PORT}/api/health" >/dev/null; then
  sudo -n tailscale funnel --bg --yes --https="${N3D_HTTPS}" "http://127.0.0.1:${N3D_PORT}" || true
else
  echo "    Skip: n3d non in ascolto su ${N3D_PORT}"
fi

echo ""
sudo -n tailscale funnel status || tailscale funnel status || true
echo ""
echo "Fatto. Da ora gli script Funnel possono usare: sudo -n tailscale ..."
echo "File: $SUDOERS_FILE"

#!/usr/bin/env bash
# Installa cron: backup ogni 5 giorni alle 03:00
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/scheduled-backup.sh"
chmod +x "$BACKUP_SCRIPT"

CRON_LINE="0 3 1,6,11,16,21,26 * * $BACKUP_SCRIPT"

( crontab -l 2>/dev/null | grep -v "scheduled-backup.sh" || true
  echo "$CRON_LINE"
) | crontab -

echo "Cron installato:"
crontab -l | grep scheduled-backup || true
echo ""
echo "Prossime esecuzioni: giorni 1, 6, 11, 16, 21, 26 di ogni mese alle 03:00"
echo "Log in: ~/CRM-APP/backups/logs/"

#!/usr/bin/env bash
# Backup PostgreSQL + copia su Google Drive (rclone) — eseguito da cron ogni 5 giorni
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$BACKEND_DIR/.." && pwd)"
LOG_DIR="${BACKUP_LOG_DIR:-$REPO_DIR/backups/logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/backup-$(date +%Y%m%d-%H%M%S).log"

exec >>"$LOG_FILE" 2>&1
echo "=== Backup $(date -Iseconds) ==="

cd "$BACKEND_DIR"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "→ pg_dump locale..."
npm run backup

BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
echo "→ Cartella backup: $BACKUP_DIR"

# Google Drive via rclone (opzionale)
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_PATH="${RCLONE_PATH:-CRM-Backups}"

if command -v rclone >/dev/null 2>&1; then
  if rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE}:"; then
    echo "→ Upload su Drive (${RCLONE_REMOTE}:${RCLONE_PATH})..."
    rclone mkdir "${RCLONE_REMOTE}:${RCLONE_PATH}" 2>/dev/null || true
    rclone copy "$BACKUP_DIR" "${RCLONE_REMOTE}:${RCLONE_PATH}" \
      --include "backup-*.sql" \
      --transfers 2 \
      --log-level INFO
    echo "→ Upload Drive completato."
  else
    echo "⚠ rclone installato ma remote '${RCLONE_REMOTE}' non configurato. Vedi docs/guida-email-smtp-completa.md"
  fi
else
  echo "⚠ rclone non installato — backup solo locale in $BACKUP_DIR"
fi

echo "=== Fine backup ==="

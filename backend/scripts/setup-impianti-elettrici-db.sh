#!/usr/bin/env bash
# Crea database Impianti Elettrici sul Mint (produzione), applica schema e seed minimo.
# Uso (sul Mint):
#   cd ~/CRM-APP && chmod +x backend/scripts/setup-impianti-elettrici-db.sh
#   ./backend/scripts/setup-impianti-elettrici-db.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$BACKEND_DIR")"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "Errore: $BACKEND_DIR/.env mancante"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$BACKEND_DIR/.env"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Errore: DATABASE_URL vuoto in backend/.env"
  exit 1
fi

# Deriva DATABASE_URL_IE dallo stesso host/credenziali del CRM
derive_ie_url() {
  local url="$1"
  if [[ "$url" == *"/crm_gestionale"* ]]; then
    echo "${url//\/crm_gestionale/\/crm_impianti_elettrici}"
    return
  fi
  # Fallback: sostituisce l'ultimo segmento path prima di ?schema=
  if [[ "$url" =~ ^(postgresql://[^/]+/)([^/?]+)(\?.*)?$ ]]; then
    echo "${BASH_REMATCH[1]}crm_impianti_elettrici${BASH_REMATCH[3]:-?schema=public}"
    return
  fi
  echo ""
}

if [[ -z "${DATABASE_URL_IE:-}" ]]; then
  DATABASE_URL_IE="$(derive_ie_url "$DATABASE_URL")"
  if [[ -z "$DATABASE_URL_IE" ]]; then
    echo "Errore: non riesco a derivare DATABASE_URL_IE da DATABASE_URL."
    echo "Aggiungi manualmente in backend/.env:"
    echo "  DATABASE_URL_IE=postgresql://USER:PASS@HOST:5432/crm_impianti_elettrici?schema=public"
    exit 1
  fi
  if ! grep -qE '^DATABASE_URL_IE=' "$BACKEND_DIR/.env"; then
    echo "" >> "$BACKEND_DIR/.env"
    echo "# Database parallelo Impianti Elettrici (dati separati dal CRM)" >> "$BACKEND_DIR/.env"
    echo "DATABASE_URL_IE=$DATABASE_URL_IE" >> "$BACKEND_DIR/.env"
    echo "==> Aggiunto DATABASE_URL_IE in backend/.env"
  else
    # Riga vuota: aggiorna
    sed -i.bak "s|^DATABASE_URL_IE=.*|DATABASE_URL_IE=$DATABASE_URL_IE|" "$BACKEND_DIR/.env"
    rm -f "$BACKEND_DIR/.env.bak"
    echo "==> Aggiornato DATABASE_URL_IE in backend/.env"
  fi
fi

export DATABASE_URL_IE

echo "==> Creazione database crm_impianti_elettrici (se non esiste)"
if command -v sudo >/dev/null 2>&1 && id -u postgres >/dev/null 2>&1; then
  sudo -u postgres psql -v ON_ERROR_STOP=0 -tc \
    "SELECT 1 FROM pg_database WHERE datname = 'crm_impianti_elettrici'" | grep -q 1 \
    && echo "    Database già presente" \
    || sudo -u postgres psql -f "$SCRIPT_DIR/create-impianti-elettrici-database-on-server.sql"

  # Grant a crm_user se esiste
  sudo -u postgres psql -d crm_impianti_elettrici -v ON_ERROR_STOP=0 <<'SQL' || true
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_user') THEN
    EXECUTE 'GRANT ALL PRIVILEGES ON DATABASE crm_impianti_elettrici TO crm_user';
    EXECUTE 'GRANT ALL ON SCHEMA public TO crm_user';
    EXECUTE 'GRANT CREATE ON SCHEMA public TO crm_user';
  END IF;
END $$;
SQL
else
  echo "    sudo/postgres non disponibile: crea il DB a mano con:"
  echo "    sudo -u postgres psql -f $SCRIPT_DIR/create-impianti-elettrici-database-on-server.sql"
fi

echo "==> Prisma db push su Impianti Elettrici"
cd "$ROOT_DIR"
DATABASE_URL="$DATABASE_URL_IE" npx prisma db push --schema=backend/prisma/schema.prisma

echo "==> Seed minimo IE"
DATABASE_URL="$DATABASE_URL_IE" npx tsx backend/prisma/seed-impianti-elettrici.ts

echo ""
echo "Database Impianti Elettrici pronto sul Mint."
echo "  Nome: crm_impianti_elettrici"
echo "  Env:  DATABASE_URL_IE (in backend/.env)"
echo "Riavvia l'API dopo il deploy del codice IE:"
echo "  pm2 restart crm-api --update-env"

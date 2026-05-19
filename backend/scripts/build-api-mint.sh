#!/usr/bin/env bash
# Build API sul Mint: SEMPRE dalla root del monorepo (evita npm ci solo in backend/).
set -euo pipefail

ROOT="${CRM_ROOT:-$HOME/CRM-APP}"
BACKEND="$ROOT/backend"

cd "$ROOT"
if [[ ! -f package-lock.json ]]; then
  echo "Errore: $ROOT/package-lock.json mancante"
  exit 1
fi

echo "==> npm ci (root monorepo)"
NPM_CI_FLAGS=()
[[ "${NODE_ENV:-}" == "production" ]] && NPM_CI_FLAGS=(--include=dev)
npm ci "${NPM_CI_FLAGS[@]}"

for pkg in node express cors; do
  if [[ ! -d "$ROOT/node_modules/@types/$pkg" ]]; then
    echo "Errore: manca @types/$pkg — esegui: cd $ROOT && npm ci"
    exit 1
  fi
done

echo "==> tsc (workspace backend)"
npm run build --workspace=backend

echo "==> Build OK — dist in $BACKEND/dist"

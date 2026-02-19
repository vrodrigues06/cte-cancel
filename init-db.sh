#!/usr/bin/env bash
set -e

if ! command -v psql >/dev/null 2>&1; then
  echo "psql não encontrado. Instale o PostgreSQL (client) e tente novamente."
  exit 1
fi

DB_NAME="${DB_NAME:-apisap}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
HOST="${HOST:-localhost}"
PORT="${PORT:-5432}"

export PGPASSWORD="$DB_PASS"

echo "Verificando disponibilidade do Postgres local em ${HOST}:${PORT}..."
for i in $(seq 1 30); do
  if pg_isready -h "$HOST" -p "$PORT" -U "$DB_USER" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Criando banco '${DB_NAME}' (se não existir)..."
psql -h "$HOST" -p "$PORT" -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};" >/dev/null 2>&1 || true

CONN="postgresql://${DB_USER}:${DB_PASS}@${HOST}:${PORT}/${DB_NAME}?schema=public"
echo "DATABASE_URL=${CONN}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR/backend"

export DATABASE_URL="$CONN"
pnpm prisma db push

echo "Postgres local pronto em ${HOST}:${PORT} e schema sincronizado."

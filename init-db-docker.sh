#!/usr/bin/env bash
set -e

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado. Instale Docker Desktop e tente novamente."
  exit 1
fi

DB_NAME="${DB_NAME:-apisap}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
HOST_PORT="${HOST_PORT:-5433}"
CONTAINER_NAME="${CONTAINER_NAME:-apisap-postgres}"
VOLUME_NAME="${VOLUME_NAME:-apisap_pgdata}"
IMAGE="${IMAGE:-postgres:16}"

if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  docker volume create "$VOLUME_NAME" >/dev/null
fi

EXISTS="$(docker ps -a -q -f name=^/${CONTAINER_NAME}$ || true)"
if [ -z "$EXISTS" ]; then
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "${HOST_PORT}:5432" \
    -v "$VOLUME_NAME":/var/lib/postgresql/data \
    "$IMAGE"
else
  RUNNING="$(docker ps -q -f name=^/${CONTAINER_NAME}$ || true)"
  if [ -z "$RUNNING" ]; then
    docker start "$CONTAINER_NAME" >/dev/null
  fi
fi

echo "Aguardando Postgres (docker) ficar pronto na porta ${HOST_PORT}..."
for i in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

CONN="postgresql://${DB_USER}:${DB_PASS}@localhost:${HOST_PORT}/${DB_NAME}?schema=public"
echo "DATABASE_URL=${CONN}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR/backend"

export DATABASE_URL="$CONN"
pnpm prisma db push

echo "Postgres (docker) pronto em localhost:${HOST_PORT} e schema sincronizado."

#!/usr/bin/env bash
set -e

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm não encontrado. Instale com: corepack enable && corepack prepare pnpm@latest --activate"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Inicializando backend..."
cd "$ROOT_DIR/backend"
if [ ! -f ".env" ]; then
  cp .env.example .env
fi
pnpm install
pnpm prisma generate
pnpm run dev &
BACK_PID=$!

echo "Inicializando frontend..."
cd "$ROOT_DIR/frontend"
if [ ! -f ".env.local" ]; then
  echo 'NEXT_PUBLIC_API_BASE_URL="http://localhost:3002"' > .env.local
fi
pnpm install
pnpm run dev

trap 'kill $BACK_PID 2>/dev/null || true' EXIT

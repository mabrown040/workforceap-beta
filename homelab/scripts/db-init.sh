#!/usr/bin/env bash
# Sync Prisma schema and seed the default org (idempotent).
set -euo pipefail

cd "$(dirname "$0")/../.."

corepack enable
corepack pnpm@10 install --frozen-lockfile

export HOMELAB_DEPLOY=1
export DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
export POSTGRES_PRISMA_URL="${POSTGRES_PRISMA_URL:-$DATABASE_URL}"
export POSTGRES_URL_NON_POOLING="${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}"

npm run db:push
npm run db:seed

echo "Database ready."

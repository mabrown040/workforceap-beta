#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[dev:stack] root: $ROOT_DIR"
echo "[dev:stack] generating Prisma client"
npm run db:generate

echo "[dev:stack] critical routes:"
node scripts/verify-preview.cjs --list-only

echo "[dev:stack] starting Next dev server on http://localhost:3000"
echo "[dev:stack] run 'npm run qa:preview -- --url http://localhost:3000' in another terminal once it is up"
exec npm run dev

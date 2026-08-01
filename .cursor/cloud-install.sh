#!/usr/bin/env bash
# Idempotent install for Cursor Cloud agents (home lab / WorkforceAP).
# Runs from repo root via environment.json "install".
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOCAL_DB_URL="postgresql://wap:wap@127.0.0.1:5432/workforceap"

echo "=== WorkforceAP cloud install ==="

corepack enable
corepack pnpm@10 install --frozen-lockfile

if command -v pg_lsclusters >/dev/null 2>&1; then
  if ! sudo pg_lsclusters 2>/dev/null | awk '{print $1}' | grep -qx '16'; then
    echo "Creating PostgreSQL 16 cluster..."
    sudo pg_createcluster 16 main
  fi
  sudo pg_ctlcluster 16 main start 2>/dev/null || true

  for _ in $(seq 1 30); do
    if sudo -u postgres psql -Atqc 'SELECT 1' >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wap') THEN
    CREATE ROLE wap WITH LOGIN PASSWORD 'wap';
  END IF;
END
$$;
SELECT 'CREATE DATABASE workforceap OWNER wap'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'workforceap')\gexec
GRANT ALL PRIVILEGES ON DATABASE workforceap TO wap;
SQL
else
  echo "WARNING: PostgreSQL not installed; pages requiring Prisma will fail at runtime."
fi

ensure_env_file() {
  local file="$1"
  if [[ -f "$file" ]] && grep -q '^DATABASE_URL=' "$file"; then
    return 0
  fi
  if [[ -f "$file" ]]; then
    printf '\nDATABASE_URL=%s\n' "$LOCAL_DB_URL" >>"$file"
    return 0
  fi
  cat >"$file" <<EOF
DATABASE_URL=$LOCAL_DB_URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
}

ensure_env_file .env
ensure_env_file .env.local

if command -v pg_lsclusters >/dev/null 2>&1 && sudo -u postgres psql -Atqc 'SELECT 1' >/dev/null 2>&1; then
  npm run db:push
  npm run db:seed
fi

echo "=== WorkforceAP cloud install complete ==="

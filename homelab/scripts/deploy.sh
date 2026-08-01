#!/usr/bin/env bash
# Pull latest code and rebuild/restart the homelab Docker stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f homelab/.env ]]; then
  echo "Missing homelab/.env — copy homelab/.env.example and fill in secrets." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source homelab/.env
set +a

echo "=== WorkforceAP homelab deploy ==="

git pull --ff-only origin "${HOMELAB_GIT_BRANCH:-master}"

docker compose -f homelab/docker-compose.yml --env-file homelab/.env pull db || true
docker compose -f homelab/docker-compose.yml --env-file homelab/.env up -d db

echo "Waiting for Postgres..."
for _ in $(seq 1 30); do
  if docker compose -f homelab/docker-compose.yml --env-file homelab/.env exec -T db \
    pg_isready -U "${POSTGRES_USER:-wap}" -d "${POSTGRES_DB:-workforceap}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker compose -f homelab/docker-compose.yml --env-file homelab/.env run --rm migrate

docker compose -f homelab/docker-compose.yml --env-file homelab/.env up -d --build web

echo "=== Deploy complete — app on port ${WEB_PORT:-3000} ==="

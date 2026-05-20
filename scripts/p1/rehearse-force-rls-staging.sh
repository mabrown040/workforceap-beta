#!/usr/bin/env bash
# Staging rehearsal orchestrator for P1 FORCE ROW LEVEL SECURITY flip.
# Applies temporary FORCE, runs extended fixtures, reverts by default.
# Pass --confirm-flip only after a clean PASS to leave FORCE applied permanently.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

CONFIRM_FLIP=0
for arg in "$@"; do
  case "$arg" in
    --confirm-flip) CONFIRM_FLIP=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/p1/rehearse-force-rls-staging.sh [--confirm-flip]

Environment:
  STAGING_DATABASE_URL   Required — direct/session Postgres URL (port 5432).
  DATABASE_URL           Used for prod guard (must differ from staging).
  SHADOW_DATABASE_URL    Used for shadow guard (must differ from staging).
  P1_STAGING_HOST_CONFIRMED=1   Bypass hostname staging check if needed.
  P1_STAGING_PROJECT_REF        Expected Supabase project ref for staging.

Flags:
  --confirm-flip   After a PASS, apply FORCE permanently (--no-revert). Default: off.
EOF
      exit 0
      ;;
    *)
      echo "[rehearse-force-rls-staging] Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

# Load .env files without overwriting existing exports
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^([^=]+)=(.*)$ ]] || continue
    local key="${BASH_REMATCH[1]}"
    local val="${BASH_REMATCH[2]}"
    val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
    if [[ -z "${!key:-}" ]]; then
      export "$key=$val"
    fi
  done < "$file"
}

load_env_file "$REPO_ROOT/.env"
load_env_file "$REPO_ROOT/.env.local"

DATE_STAMP="$(date -u +%Y-%m-%d)"
SNAPSHOT_DIR="$REPO_ROOT/artifacts/p1-force-rls-staging-snapshot-$DATE_STAMP"
REPORT_PATH="$REPO_ROOT/docs/rehearsals/p1-force-rls-staging-$DATE_STAMP.md"

normalize_url() {
  local url="$1"
  url="${url/postgres:/postgresql:}"
  echo "$url" | sed -E 's/\?.*$//'
}

supabase_ref_from_url() {
  local url="$1"
  local user
  user="$(python3 - <<PY
import os, urllib.parse
u = urllib.parse.urlparse(os.environ["URL"].replace("postgres://","postgresql://",1))
print(urllib.parse.unquote(u.username or ""))
PY
)"
  if [[ "$user" =~ ^postgres\.([a-zA-Z0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[rehearse-force-rls-staging] Required command not found: $1" >&2
    exit 1
  }
}

echo "[rehearse-force-rls-staging] P1 staging FORCE RLS rehearsal ($DATE_STAMP)"

if [[ -z "${STAGING_DATABASE_URL:-}" ]]; then
  echo "[rehearse-force-rls-staging] STAGING_DATABASE_URL is required." >&2
  exit 1
fi

STAGING_NORM="$(normalize_url "$STAGING_DATABASE_URL")"
PROD_NORM=""
SHADOW_NORM=""
[[ -n "${DATABASE_URL:-}" ]] && PROD_NORM="$(normalize_url "$DATABASE_URL")"
[[ -n "${SHADOW_DATABASE_URL:-}" ]] && SHADOW_NORM="$(normalize_url "$SHADOW_DATABASE_URL")"

if [[ -n "$PROD_NORM" && "$STAGING_NORM" == "$PROD_NORM" ]]; then
  echo "[rehearse-force-rls-staging] Refusing: STAGING_DATABASE_URL equals DATABASE_URL (production)." >&2
  exit 1
fi

if [[ -n "$SHADOW_NORM" && "$STAGING_NORM" == "$SHADOW_NORM" ]]; then
  echo "[rehearse-force-rls-staging] Refusing: STAGING_DATABASE_URL equals SHADOW_DATABASE_URL." >&2
  exit 1
fi

URL="$STAGING_DATABASE_URL"
export URL
STAGING_REF="$(supabase_ref_from_url "$STAGING_DATABASE_URL")"
if [[ -n "$PROD_NORM" ]]; then
  PROD_REF="$(supabase_ref_from_url "$DATABASE_URL")"
  if [[ -n "$STAGING_REF" && -n "$PROD_REF" && "$STAGING_REF" == "$PROD_REF" ]]; then
    echo "[rehearse-force-rls-staging] Refusing: staging Supabase ref matches production." >&2
    exit 1
  fi
fi
if [[ -n "$SHADOW_NORM" ]]; then
  SHADOW_REF="$(supabase_ref_from_url "$SHADOW_DATABASE_URL")"
  if [[ -n "$STAGING_REF" && -n "$SHADOW_REF" && "$STAGING_REF" == "$SHADOW_REF" ]]; then
    echo "[rehearse-force-rls-staging] Refusing: staging Supabase ref matches shadow." >&2
    exit 1
  fi
fi

STAGING_HOST="$(python3 - <<PY
import os, urllib.parse
u = urllib.parse.urlparse(os.environ["STAGING_DATABASE_URL"].replace("postgres://","postgresql://",1))
print(u.hostname or "")
PY
)"
STAGING_HOST="${STAGING_HOST,,}"
if [[ "$STAGING_HOST" != *staging* && "${P1_STAGING_HOST_CONFIRMED:-}" != "1" ]]; then
  if [[ -z "${P1_STAGING_PROJECT_REF:-}" || "$STAGING_REF" != "$P1_STAGING_PROJECT_REF" ]]; then
    echo "[rehearse-force-rls-staging] Host guard failed for '$STAGING_HOST'." >&2
    echo "Set P1_STAGING_HOST_CONFIRMED=1 or P1_STAGING_PROJECT_REF=<ref> if this is staging." >&2
    exit 1
  fi
fi

echo "[rehearse-force-rls-staging] Target host: $STAGING_HOST (ref: ${STAGING_REF:-unknown})"

require_cmd pg_dump
require_cmd psql

mkdir -p "$SNAPSHOT_DIR"

echo "[rehearse-force-rls-staging] Snapshot schema → $SNAPSHOT_DIR/schema.sql"
pg_dump "$STAGING_DATABASE_URL" --schema-only --no-owner --no-privileges > "$SNAPSHOT_DIR/schema.sql"

echo "[rehearse-force-rls-staging] Snapshot RLS policy inventory → $SNAPSHOT_DIR/rls-policies.tsv"
psql "$STAGING_DATABASE_URL" -At -F $'\t' -c \
  "SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;" \
  > "$SNAPSHOT_DIR/rls-policies.tsv"

SAMPLE_TABLES="users organizations applications placement_records audit_logs audit_events jobs mentor_sessions weekly_recaps"
if psql "$STAGING_DATABASE_URL" -At -c "SELECT to_regclass('public.coach_memories')" | grep -q coach_memories; then
  SAMPLE_TABLES="$SAMPLE_TABLES coach_memories"
fi

echo "[rehearse-force-rls-staging] Snapshot sample row counts → $SNAPSHOT_DIR/sample-counts.tsv"
: > "$SNAPSHOT_DIR/sample-counts.tsv"
for tbl in $SAMPLE_TABLES; do
  if psql "$STAGING_DATABASE_URL" -At -c "SELECT to_regclass('public.$tbl')" | grep -q "$tbl"; then
    count="$(psql "$STAGING_DATABASE_URL" -At -c "SELECT COUNT(*) FROM \"$tbl\"")"
    printf '%s\t%s\n' "$tbl" "$count" >> "$SNAPSHOT_DIR/sample-counts.tsv"
  fi
done

echo "[rehearse-force-rls-staging] Running extended FORCE RLS fixtures (revert unless --confirm-flip)…"
export P1_RLS_TARGET=staging
export P1_RLS_EXTENDED=1

set +e
if [[ "$CONFIRM_FLIP" -eq 1 ]]; then
  npx tsx scripts/p1/test-force-rls.ts --target=staging --extended --no-revert
else
  npx tsx scripts/p1/test-force-rls.ts --target=staging --extended
fi
TEST_EXIT=$?
set -e

if [[ ! -f "$REPORT_PATH" ]]; then
  echo "[rehearse-force-rls-staging] Expected report missing: $REPORT_PATH" >&2
  exit 1
fi

{
  echo ""
  echo "## Orchestrator metadata"
  echo ""
  echo "- Snapshot directory: \`artifacts/p1-force-rls-staging-snapshot-$DATE_STAMP/\`"
  echo "- Confirm flip requested: $([[ "$CONFIRM_FLIP" -eq 1 ]] && echo yes || echo no)"
  echo "- Staging host: \`$STAGING_HOST\`"
  echo "- Staging Supabase ref: \`${STAGING_REF:-unknown}\`"
} >> "$REPORT_PATH"

if [[ "$TEST_EXIT" -ne 0 ]]; then
  echo "[rehearse-force-rls-staging] FAIL — see $REPORT_PATH" >&2
  if [[ "$CONFIRM_FLIP" -eq 1 ]]; then
    echo "[rehearse-force-rls-staging] --confirm-flip ignored because fixtures did not PASS." >&2
  fi
  exit "$TEST_EXIT"
fi

echo "[rehearse-force-rls-staging] PASS — report: $REPORT_PATH"

if [[ "$CONFIRM_FLIP" -eq 1 ]]; then
  echo "[rehearse-force-rls-staging] FORCE ROW LEVEL SECURITY retained on all RLS-enabled tables (--confirm-flip)."
  echo "[rehearse-force-rls-staging] Rollback: see docs/rehearsals/p1-force-rls-runbook.md"
else
  echo "[rehearse-force-rls-staging] Rehearsal complete; FORCE was reverted."
  echo "[rehearse-force-rls-staging] To apply permanently after review: pnpm p1:rehearse-staging:flip"
fi

exit 0

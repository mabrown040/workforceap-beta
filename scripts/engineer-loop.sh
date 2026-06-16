#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage: scripts/engineer-loop.sh <command>

Commands
  prep        Print repo context and high-signal command map
  auth        Repair portal test auth/bootstrap state
  routes      Sweep portal routes with the audit runner
  unit        Run unit tests
  e2e         Run Playwright end-to-end tests
  build       Run the production build path
  verify      Run the standard engineer verification loop

The verify loop runs:
  1. auth
  2. unit
  3. routes
  4. build
EOF
}

cmd="${1:-}"

if [[ -z "$cmd" ]]; then
  usage
  exit 1
fi

run() {
  printf '\n[%s] %s\n' "engineer-loop" "$*"
  "$@"
}

case "$cmd" in
  prep)
    cat <<'EOF'
WorkforceAP engineer loop
  repo      : /home/claw/.openclaw/workspace/developer/workforceap-beta
  branch    : use a fresh branch per slice
  guardrail : read docs/AGENT_CHANGE_GUARDRAILS.md before UX/product changes
  stakes    : read docs/PRODUCT_STAKES.md before public-surface changes

Primary commands
  npm run db:sync-test-auth
  npm run test:unit
  node scripts/audit-portal-routes.mjs
  npm run test:e2e
  npm run build
EOF
    ;;
  auth)
    run npm run db:sync-test-auth
    ;;
  routes)
    run node scripts/audit-portal-routes.mjs
    ;;
  unit)
    run npm run test:unit
    ;;
  e2e)
    run npm run test:e2e
    ;;
  build)
    run npm run build
    ;;
  verify)
    run "$0" auth
    run "$0" unit
    run "$0" routes
    run "$0" build
    ;;
  *)
    usage
    exit 1
    ;;
esac

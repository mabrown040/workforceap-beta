#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage: scripts/dispatch-board.sh <lane> [topic]

Lanes:
  engineer   feature, bug, API, Prisma, auth
  ux         copy, hierarchy, page polish
  security   auth, middleware, public endpoints, validation
  product    scope, stakes, tradeoffs
  lookup     code/context retrieval only

Examples:
  scripts/dispatch-board.sh engineer "portal nav bug"
  scripts/dispatch-board.sh lookup "PortalLayoutClient"
EOF
}

lane="${1:-}"
topic="${2:-}"

if [[ -z "$lane" ]]; then
  usage
  exit 1
fi

printf '[dispatch] repo: %s\n' "$ROOT_DIR"
printf '[dispatch] source: %s\n' "$(cat .gbrain-source 2>/dev/null || echo unset)"

case "$lane" in
  engineer)
    cat <<EOF
[lane] engineer
[topic] ${topic:-unspecified}
[lookup]
  gbrain query "${topic:-portal auth flow}" --source workforceap
  gbrain query "${topic:-portal auth flow}" --lang typescript
  rg -n "${topic:-PortalLayoutClient|sync-test-auth|wioa-qualification}" .
[gate]
  scripts/engineer-loop.sh verify
[escalate]
  scripts/engineer-loop.sh e2e
EOF
    ;;
  ux)
    cat <<EOF
[lane] ux
[topic] ${topic:-unspecified}
[read-first]
  docs/PRODUCT_STAKES.md
  docs/AGENT_CHANGE_GUARDRAILS.md
[lookup]
  gbrain query "${topic:-portal navigation clarity}" --source workforceap
  rg -n "${topic:-PortalNav|LanguageToggle|TrainingCourseList}" components app css .
[gate]
  node scripts/audit-portal-routes.mjs
  npm run build
EOF
    ;;
  security)
    cat <<EOF
[lane] security
[topic] ${topic:-unspecified}
[lookup]
  gbrain query "${topic:-public endpoint auth validation}" --source workforceap
  gbrain query "${topic:-public endpoint auth validation}" --lang typescript
  rg -n "${topic:-middleware|rateLimit|auth|session|validation}" app/api lib middleware.ts prisma .
[gate]
  scripts/engineer-loop.sh build
[review]
  auth checks
  input validation
  public exposure
EOF
    ;;
  product)
    cat <<EOF
[lane] product
[topic] ${topic:-unspecified}
[read-first]
  docs/PRODUCT_STAKES.md
  docs/AGENT_CHANGE_GUARDRAILS.md
[lookup]
  gbrain query "${topic:-WorkforceAP product stakes}" --source workforceap
[gate]
  confirm scope is narrow
  confirm no locked stake changes
EOF
    ;;
  lookup)
    cat <<EOF
[lane] lookup
[topic] ${topic:-unspecified}
[context]
  gbrain query "${topic:-PortalLayoutClient}" --source workforceap
[broad-code]
  gbrain query "${topic:-PortalLayoutClient}" --lang typescript
[exact-code]
  rg -n "${topic:-PortalLayoutClient}" .
EOF
    ;;
  *)
    usage
    exit 1
    ;;
esac

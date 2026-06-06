#!/usr/bin/env bash
# Install the crabbox pre-push gate hook.
# Run once per clone: ./scripts/install-crabbox-hook.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_SRC="$REPO_ROOT/scripts/crabbox-gate.sh"
HOOK_DST="$REPO_ROOT/.git/hooks/pre-push"

if [[ ! -d "$REPO_ROOT/.git/hooks" ]]; then
    echo "❌ Not a git repo. Run from within the WAP repo."
    exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo "✅ Crabbox pre-push gate installed at .git/hooks/pre-push"
echo "   Every push to master will now run:"
echo "   1. Local typecheck (fast fail)"
echo "   2. Crabbox clean-room: pnpm install → typecheck → test:unit → build"
echo ""
echo "   To skip in an emergency: git push --no-verify"

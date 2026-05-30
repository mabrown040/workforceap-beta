#!/bin/bash
# Clawpatch pre-push hook — runs review on changed features vs main
# Copy to .git/hooks/pre-push and make executable
# Or symlink: ln -s ../../scripts/clawpatch-pre-push.sh .git/hooks/pre-push

set -e

FEATURE_BRANCH=$(git branch --show-current)
UPSTREAM="main"

echo "🔍 Clawpatch: reviewing changes on $FEATURE_BRANCH vs $UPSTREAM..."

# Only run if clawpatch is available
if ! command -v clawpatch &>/dev/null; then
  echo "⚠️  clawpatch not found in PATH, skipping review"
  exit 0
fi

# Run review on changed features only
clawpatch review --since "$UPSTREAM" --jobs 10 --quiet || true

# Report location
REPORT_DIR=".clawpatch/reports"
LATEST_REPORT=$(ls -t "$REPORT_DIR"/*.md 2>/dev/null | head -1)

if [ -n "$LATEST_REPORT" ]; then
  FINDINGS=$(grep -c "^## " "$LATEST_REPORT" 2>/dev/null || echo "0")
  echo "📋 Clawpatch report: $LATEST_REPORT ($FINDINGS findings)"
  
  if [ "$FINDINGS" -gt 0 ]; then
    echo "⚠️  $FINDINGS finding(s) detected — review before opening PR"
  else
    echo "✅ Clean — no findings"
  fi
fi

# Always allow push (non-blocking); this is advisory only
echo "🏁 Push continuing..."
exit 0

#!/usr/bin/env bash
# Low-Risk Auto-Approval — Tier 3
# Automatically merges PRs that meet safety criteria.
# NEVER merges high-risk changes (auth, DB schema, API routes, deps).

set -euo pipefail

WORKSPACE="/home/mike/.openclaw-dench/workspace"
REPO="$WORKSPACE/wap-repo"
LOG="$WORKSPACE/logs/auto-approval-$(date +%F).log"
mkdir -p "$(dirname "$LOG")"

echo "[$(date -Iseconds)] Auto-approval scan starting" >> "$LOG"

cd "$REPO"

# Get open PRs authored by agents (Dench/Claude/Codex/Cursor)
gh pr list --state open --author @me --json number,title,headRefName,files --limit 20 2>/dev/null | \
  jq -r '.[] | "\(.number)|\(.title)|\(.headRefName)"' | \
  while IFS='|' read -r NUM TITLE BRANCH; do
    
    echo "[$(date -Iseconds)] Checking PR #$NUM: $TITLE" >> "$LOG"
    
    # Get changed files
    FILES=$(gh pr view "$NUM" --json files --jq '.files[].path' 2>/dev/null || echo "")
    
    # HIGH-RISK BLOCKLIST — never auto-merge these
    HIGH_RISK=$(echo "$FILES" | grep -iE \
      'auth/|auth\.ts|auth\.tsx|middleware|route\.ts|route\.tsx|prisma/schema|migration|\.env|package\.json|package-lock|yarn\.lock|dockerfile|docker-compose|terraform|\.github/workflows' \
      || true)
    
    if [ -n "$HIGH_RISK" ]; then
      echo "[$(date -Iseconds)] BLOCKED (high-risk files): $HIGH_RISK" >> "$LOG"
      continue
    fi
    
    # LOW-RISK ALLOWLIST — safe to auto-merge
    LOW_RISK=$(echo "$FILES" | grep -vE \
      'auth/|auth\.ts|auth\.tsx|middleware|route\.ts|route\.tsx|prisma/schema|migration|\.env|package\.json|package-lock|yarn\.lock|dockerfile|docker-compose|terraform|\.github/workflows' \
      | grep -E \
      '\.css$|\.scss$|\.md$|\.txt$|\.json$|page\.tsx$|layout\.tsx$|component|client|\.test\.|\.spec\.' \
      || true)
    
    if [ -z "$LOW_RISK" ]; then
      echo "[$(date -Iseconds)] SKIP (no low-risk files)" >> "$LOG"
      continue
    fi
    
    # Check CI status
    CI_STATUS=$(gh pr checks "$NUM" --json state --jq '.[].state' 2>/dev/null | head -1 || echo "UNKNOWN")
    
    if [ "$CI_STATUS" != "SUCCESS" ] && [ "$CI_STATUS" != "UNKNOWN" ]; then
      echo "[$(date -Iseconds)] SKIP (CI not green: $CI_STATUS)" >> "$LOG"
      continue
    fi
    
    # Check for merge conflicts
    MERGEABLE=$(gh pr view "$NUM" --json mergeStateStatus --jq '.mergeStateStatus' 2>/dev/null || echo "UNKNOWN")
    
    if [ "$MERGEABLE" != "CLEAN" ]; then
      echo "[$(date -Iseconds)] SKIP (merge conflicts: $MERGEABLE)" >> "$LOG"
      continue
    fi
    
    # All checks pass — auto-merge
    echo "[$(date -Iseconds)] AUTO-MERGING PR #$NUM: $TITLE" >> "$LOG"
    echo "[$(date -Iseconds)] Files: $LOW_RISK" >> "$LOG"
    
    gh pr merge "$NUM" --squash --delete-branch >> "$LOG" 2>&1 || {
      echo "[$(date -Iseconds)] MERGE FAILED for #$NUM" >> "$LOG"
      continue
    }
    
    echo "[$(date -Iseconds)] ✅ MERGED PR #$NUM" >> "$LOG"
    
    # Notify
    if command -v openclaw &> /dev/null; then
      openclaw message send --channel discord \
        --message "✅ **Auto-merged** PR #$NUM: $TITLE\nFiles: $(echo $LOW_RISK | tr '\n' ', ')" \
        2>/dev/null || true
    fi
  done

echo "[$(date -Iseconds)] Auto-approval scan complete" >> "$LOG"

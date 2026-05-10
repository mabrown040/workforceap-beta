#!/usr/bin/env bash
# Parallel Codex Agent Runner — PR #1148 Verification
# Spawns 5 codex exec processes in parallel, each with a focused prompt

set -euo pipefail

REPO="/home/mike/.openclaw-dench/workspace/wap-repo"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTDIR="$REPO/artifacts/codex-verification-$TIMESTAMP"
mkdir -p "$OUTDIR"

PROMPTS=(
  "Review /dashboard/training page code in this repo. Find trust issues, mobile UX problems, honest error states, and unqualified 'free' claims. Return file paths + line numbers + severity."
  "Review partner portal code (dashboard/partner, /partner). Check referral tracking accuracy, member completion visibility, pipeline data truth, export capability. Return specific findings."
  "Review Spanish locale code. Find hardcoded English strings, missing i18n keys in messages/es.json and messages/pt.json, layout breakage from longer translations. Return en.json additions needed."
  "Review admin surfaces added in recent commits: /admin/coursera/health, /admin/members/[id]/stakeholder, MemberCourseraDiagnoseButton. Check for data accuracy, role guards, error handling."
  "Review lib/auth/roles.ts and role checks across the codebase. Verify super_admin can access all progress data. Find any role that blocks legitimate access."
)

NAMES=("Member-Voice" "Partner-Voice" "Global-Voice" "Admin-Surfaces" "Role-Guards")

spawn_agent() {
  local idx=$1
  local name="${NAMES[$idx]}"
  local prompt="${PROMPTS[$idx]}"
  local log="$OUTDIR/$name.log"
  local out="$OUTDIR/$name.md"

  echo "[$(date -Iseconds)] Spawning $name..." | tee -a "$OUTDIR/runner.log"

  cd "$REPO"
  # Run codex exec, capture output
  if codex exec "$prompt" > "$log" 2>&1; then
    echo "[$(date -Iseconds)] $name DONE" | tee -a "$OUTDIR/runner.log"
    # Extract the review portion (after the token count line)
    tail -n +$(grep -n "^user$" "$log" | tail -1 | cut -d: -f1) "$log" > "$out" 2>/dev/null || cp "$log" "$out"
  else
    echo "[$(date -Iseconds)] $name FAILED (exit $? )" | tee -a "$OUTDIR/runner.log"
    cp "$log" "$OUTDIR/$name-failed.log"
  fi
}

# Spawn all 5 in background
for i in 0 1 2 3 4; do
  spawn_agent "$i" &
done

# Wait for all
echo "[$(date -Iseconds)] Waiting for 5 agents..." | tee -a "$OUTDIR/runner.log"
wait
echo "[$(date -Iseconds)] All agents complete." | tee -a "$OUTDIR/runner.log"
echo "Output: $OUTDIR"

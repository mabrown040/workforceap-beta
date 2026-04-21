#!/usr/bin/env bash
# Self-Healing Subagent Runner — Tier 2
# Wraps any subagent spawn with retry logic, backoff, and escalation.
#
# Usage: healable-spawn.sh <label> <task_description> [max_retries=2]

set -euo pipefail

LABEL="${1:-unnamed}"
TASK="${2:-}"
MAX_RETRIES="${3:-2}"

WORKSPACE="/home/mike/.openclaw-dench/workspace"
LOG="$WORKSPACE/logs/healable-$(date +%F)-${LABEL}.log"
mkdir -p "$(dirname "$LOG")"

retry_count=0
last_error=""

while [ $retry_count -le $MAX_RETRIES ]; do
  echo "[$(date -Iseconds)] Attempt $((retry_count + 1))/$((MAX_RETRIES + 1)) for: $LABEL" >> "$LOG"
  
  # Try spawning the subagent
  if openclaw sessions_spawn \
    --label "$LABEL-attempt-$retry_count" \
    --mode run \
    --task "$TASK" \
    >> "$LOG" 2>&1; then
    
    echo "[$(date -Iseconds)] Success on attempt $((retry_count + 1))" >> "$LOG"
    exit 0
  fi
  
  last_error="Subagent failed on attempt $((retry_count + 1))"
  echo "[$(date -Iseconds)] FAILED: $last_error" >> "$LOG"
  
  retry_count=$((retry_count + 1))
  
  if [ $retry_count -le $MAX_RETRIES ]; then
    # Exponential backoff: 5min, 10min, 20min
    backoff=$((5 * (2 ** (retry_count - 1))))
    echo "[$(date -Iseconds)] Retrying in ${backoff} minutes..." >> "$LOG"
    sleep "${backoff}m"
    
    # On retry, narrow the task scope
    TASK="$TASK

NOTE: This is retry attempt $retry_count. Previous attempt failed. Focus on the smallest viable slice that can ship independently. If blocked, explicitly state what is blocking and stop."
  fi
done

# All retries exhausted — escalate to human
echo "[$(date -Iseconds)] ESCALATING to human after $MAX_RETRIES retries." >> "$LOG"

# Write escalation notice
ESC_FILE="$WORKSPACE/logs/escalation-$(date +%F)-${LABEL}.md"
cat > "$ESC_FILE" << EOF
# Escalation — $(date +%F)

## Task
$LABEL

## Description
$TASK

## Retries
$MAX_RETRIES

## Last Error
$last_error

## Log
$LOG

## Action Required
Please review the log and either:
1. Fix the blocker and requeue the task
2. Take over the task manually
3. Adjust the task scope and retry
EOF

# Notify via Discord if possible
if command -v openclaw &> /dev/null; then
  openclaw message send --channel discord \
    --message "🚨 **Escalation** — Agent '$LABEL' failed after $MAX_RETRIES retries.\nSee: $ESC_FILE" \
    2>/dev/null || true
fi

exit 1

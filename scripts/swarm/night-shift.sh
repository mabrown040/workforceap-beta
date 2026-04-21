#!/usr/bin/env bash
# Night Shift — Autonomous agent swarm runner
# Triggered by cron at 02:00 America/Chicago
#
# What it does:
# 1. Reads agent_tasks table for highest-priority pending task
# 2. Spawns a subagent to build it
# 3. Writes session handoff for morning review
# 4. If nothing in queue, picks from sprint plan automatically

set -euo pipefail

WORKSPACE="/home/mike/.openclaw-dench/workspace"
REPO="$WORKSPACE/wap-repo"
LOG="$WORKSPACE/logs/night-shift-$(date +%F).log"
HANDOFF="$WORKSPACE/docs/session-handoffs/$(date +%F)-night-shift.md"

mkdir -p "$(dirname "$LOG")" "$(dirname "$HANDOFF")"

echo "[$(date -Iseconds)] Night shift starting" >> "$LOG"

# Ensure task queue table exists
cd "$REPO"
npx ts-node -e "
import { prisma } from '@/lib/db/prisma';
async function init() {
  await prisma.\$executeRawUnsafe(\`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id INTEGER PRIMARY KEY,
      task TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      retries INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 2,
      assigned_agent TEXT,
      result TEXT,
      error TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    )\`);
}
init().catch(console.error).finally(() => prisma.\$disconnect());
" 2>> "$LOG" || true

# Determine what to build
TASK=$(cd "$REPO" && npx ts-node -e "
import { claimNextTask } from '@/lib/swarm/taskQueue';
async function main() {
  const t = await claimNextTask('night-shift');
  console.log(t ? JSON.stringify(t) : 'NO_TASK');
}
main().catch(() => console.log('NO_TASK'));
" 2>/dev/null)

if [ "$TASK" = "NO_TASK" ] || [ -z "$TASK" ]; then
  # No task in queue — read sprint plan and pick next item
  echo "[$(date -Iseconds)] No queued task. Auto-picking from sprint plan." >> "$LOG"
  
  # Extract next unshipped P0/P1 item from sprint plan
  NEXT_TASK=$(grep -A2 "^### .*Status.*Not started\|^### .*Status.*🔴\|^### .*Status.*🟡" "$WORKSPACE/docs/workforceap-next-sprint-plan-2026-04-19.md" | head -6 | tr '\n' ' ')
  
  if [ -n "$NEXT_TASK" ]; then
    # Enqueue it
    npx ts-node -e "
import { enqueueTask } from '@/lib/swarm/taskQueue';
async function main() {
  await enqueueTask('$NEXT_TASK', 10, 2);
}
main().catch(console.error);
" 2>> "$LOG" || true
    TASK="$NEXT_TASK"
  else
    echo "[$(date -Iseconds)] Nothing to do. Exiting." >> "$LOG"
    exit 0
  fi
fi

# Build session handoff header
cat > "$HANDOFF" << EOF
# Night Shift Session — $(date +%F)

## Task
\`$TASK\`

## Agent
night-shift

## Started
$(date -Iseconds)

## Status
RUNNING

---
EOF

echo "[$(date -Iseconds)] Spawning subagent for: $TASK" >> "$LOG"

# Spawn the subagent (uses openclaw sessions_spawn)
openclaw sessions_spawn \
  --label "night-shift-$(date +%F)" \
  --mode run \
  --task "Load and follow the skill at /home/mike/.openclaw-dench/workspace/skills/gstack/SKILL.md. 

Your task: $TASK

Rules:
- Work in a feature branch: claude/night-shift-$(date +%F)
- Run npx tsc --noEmit before pushing
- Open a PR, do NOT merge without Mike's approval
- Write results to $HANDOFF
- If blocked, mark task blocked with reason

End of task: report what was built, what PR was opened, and what remains." \
  >> "$LOG" 2>&1 || {
    echo "[$(date -Iseconds)] Subagent failed. Will retry on next cron." >> "$LOG"
    exit 1
  }

echo "[$(date -Iseconds)] Night shift complete" >> "$LOG"

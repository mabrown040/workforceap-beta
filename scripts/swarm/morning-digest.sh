#!/usr/bin/env bash
# Morning Digest — Sends overnight swarm summary to Mike
# Triggered by cron at 08:00 America/Chicago

set -euo pipefail

WORKSPACE="/home/mike/.openclaw-dench/workspace"
LOG="$WORKSPACE/logs/night-shift-$(date +%F).log"
HANDOFF="$WORKSPACE/docs/session-handoffs/$(date -d yesterday +%F)-night-shift.md"

# Build digest message
MSG="🌅 **Morning Digest — $(date +%F)**\n\n"

# Check if night shift ran
if [ -f "$LOG" ]; then
  DONE=$(grep -c "complete" "$LOG" 2>/dev/null || echo "0")
  if [ "$DONE" -gt 0 ] 2>/dev/null; then
    MSG+="✅ Night shift ran.\n"
  else
    MSG+="⚠️ Night shift may not have completed. Check logs.\n"
  fi
else
  MSG+="⚠️ No night shift log found.\n"
fi

# Read task queue status
cd "$WORKSPACE/wap-repo"
SUMMARY=$(npx ts-node -e "
import { prisma } from '@/lib/db/prisma';
async function main() {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const rows = await prisma.\$queryRawUnsafe\`
    SELECT status, COUNT(*) as cnt
    FROM agent_tasks
    WHERE created_at >= \${since.toISOString()}
    GROUP BY status
  \`;
  console.log(JSON.stringify(rows));
}
main().catch(() => console.log('[]'));
" 2>/dev/null || echo "[]")

MSG+="\n**Overnight Tasks:**\n"
MSG+="\`\`\`\n$SUMMARY\n\`\`\`\n"

# Check for open PRs
PRS=$(cd "$WORKSPACE/wap-repo" && gh pr list --author @me --state open --json number,title 2>/dev/null | jq -r '.[] | "- #\(.number): \(.title)"' 2>/dev/null || echo "")

if [ -n "$PRS" ]; then
  MSG+="\n**Open PRs:**\n$PRS\n"
else
  MSG+="\nNo open PRs.\n"
fi

# Blocked items
BLOCKED=$(cd "$WORKSPACE/wap-repo" && npx ts-node -e "
import { prisma } from '@/lib/db/prisma';
async function main() {
  const rows = await prisma.\$queryRawUnsafe\`
    SELECT task, error FROM agent_tasks
    WHERE status = 'blocked' ORDER BY created_at DESC LIMIT 5
  \`;
  console.log(JSON.stringify(rows));
}
main().catch(() => console.log('[]'));
" 2>/dev/null || echo "[]")

if [ "$BLOCKED" != "[]" ]; then
  MSG+="\n🚨 **Blocked (needs you):**\n$BLOCKED\n"
fi

# Send via Discord webhook or message tool
# Using OpenClaw message tool if Discord channel is configured
if command -v openclaw &> /dev/null; then
  openclaw message send --channel discord --message "$MSG" 2>/dev/null || echo "Discord not configured, writing to file"
fi

# Also write to workspace digest file
echo -e "$MSG" > "$WORKSPACE/logs/morning-digest-$(date +%F).md"

echo "Morning digest sent."

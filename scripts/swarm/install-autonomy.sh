#!/usr/bin/env bash
# Swarm Autonomy Setup — Install all three tiers
# Run once to wire crontab, verify deps, and test

set -euo pipefail

WORKSPACE="/home/mike/.openclaw-dench/workspace"
SCRIPTS="$WORKSPACE/scripts"
CRON_TAG="# WORKFORCEAP-SWARM-AUTONOMY"

echo "=== WorkforceAP Swarm Autonomy Setup ==="
echo ""

# Check deps
echo "Checking dependencies..."
command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI not found. Install: https://cli.github.com"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx not found. Install Node.js."; exit 1; }
echo "✅ gh CLI and npx found"

# Check gh auth
gh auth status >/dev/null 2>&1 || { echo "❌ gh not authenticated. Run: gh auth login"; exit 1; }
echo "✅ gh authenticated"

# Check openclaw
command -v openclaw >/dev/null 2>&1 || { echo "⚠️ openclaw CLI not found. Night shift spawn may fail."; }

# Remove old cron entries if present
echo ""
echo "Wiring crontab..."
(crontab -l 2>/dev/null | grep -v "$CRON_TAG" || true) > /tmp/crontab-clean

# Add new entries
cat >> /tmp/crontab-clean << EOF

# WORKFORCEAP-SWARM-AUTONOMY — Tier 1: Night shift + morning digest
0 2 * * * cd $WORKSPACE && $SCRIPTS/night-shift.sh >> $WORKSPACE/logs/cron.log 2>&1
0 8 * * * cd $WORKSPACE && $SCRIPTS/morning-digest.sh >> $WORKSPACE/logs/cron.log 2>&1

# WORKFORCEAP-SWARM-AUTONOMY — Tier 2: Self-healing retries
# (Handled within night-shift.sh via healable-spawn.sh)

# WORKFORCEAP-SWARM-AUTONOMY — Tier 3: Low-risk auto-approval
*/30 * * * * cd $WORKSPACE && $SCRIPTS/auto-approval.sh >> $WORKSPACE/logs/cron.log 2>&1

EOF

# Install crontab
crontab /tmp/crontab-clean
rm /tmp/crontab-clean

echo "✅ Crontab installed:"
echo "   02:00 — Night shift (build from task queue or sprint plan)"
echo "   08:00 — Morning digest (Discord summary of overnight work)"
echo "   every 30min — Auto-approval scan (low-risk PRs only)"

# Create logs dir
mkdir -p "$WORKSPACE/logs"

# Test task queue table
echo ""
echo "Testing task queue..."
cd "$WORKSPACE/wap-repo"
npx ts-node -e "
import { prisma } from '@/lib/db/prisma';
async function test() {
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
  console.log('✅ Task queue table ready');
}
test().catch(e => { console.error('❌', e.message); process.exit(1); }).finally(() => prisma.\$disconnect());
" || { echo "❌ Task queue test failed"; exit 1; }

# Enqueue a test task
cd "$WORKSPACE/wap-repo"
npx ts-node -e "
import { enqueueTask } from '@/lib/swarm/taskQueue';
async function test() {
  const t = await enqueueTask('Test task — verify swarm autonomy is wired', 0, 1);
  console.log('✅ Test task enqueued:', t.id);
}
test().catch(e => { console.error('❌', e.message); process.exit(1); }).finally(() => prisma.\$disconnect());
" || { echo "❌ Test enqueue failed"; exit 1; }

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Review crontab: crontab -l"
echo "2. Check logs: tail -f $WORKSPACE/logs/cron.log"
echo "3. Add tasks: npx ts-node -e \"import { enqueueTask } from './lib/swarm/taskQueue'; enqueueTask('your task')\""
echo "4. Or let the night shift auto-pick from the sprint plan"
echo ""
echo "Files created:"
ls -la $SCRIPTS/*.sh | awk '{print "  " $9}'
echo ""

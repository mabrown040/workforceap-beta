#!/usr/bin/env node
/**
 * Cross-platform migration runner.
 * 1. Optionally resolves failed migrations (rolled-back) from migrate status output
 * 2. Runs prisma migrate deploy
 * 3. Exits with deploy exit code
 *
 * Do NOT call `migrate resolve --applied` here for migrations already in history:
 * Prisma P3008 if they are already recorded — breaks Vercel/CI on every deploy.
 */
const { spawnSync } = require('child_process');

// Load prisma env vars
require('./ensure-prisma-env.cjs');

// One-off `resolve --applied` for legacy DBs caused P3008 on Supabase once rows exist — keep empty.
const MARK_APPLIED = [];

// Prod DB may list these as *failed* after a partial apply → P3009 blocks deploy until resolved.
const MARK_ROLLED_BACK = [
  '20260323999999_add_missing_partner_notify_columns',
  '20260326120000_portal_message_threads_kind',
  '20260327100000_counselor_optional_partner',
];

function run(args, ignoreError = false) {
  const result = spawnSync(process.execPath, [require.resolve('./prisma-env.js'), ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (!ignoreError && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.status ?? 0;
}

// Skip migrations entirely if no real DB is configured
if (process.env.__PRISMA_PLACEHOLDER_DB === '1') {
  console.log('safe-migrate: no DATABASE_URL / POSTGRES_* configured — skipping migrations');
  process.exit(0);
}

// Mark migrations as applied (tables already exist in prod DB)
for (const migration of MARK_APPLIED) {
  console.log(`Marking migration as applied: ${migration}`);
  run(['prisma', 'migrate', 'resolve', '--applied', migration], true);
}

// Mark migrations as rolled back (never fully applied)
for (const migration of MARK_ROLLED_BACK) {
  console.log(`Marking migration as rolled back: ${migration}`);
  run(['prisma', 'migrate', 'resolve', '--rolled-back', migration], true);
}

// Before migrate deploy: clear P3009 failed state (parse migrate status; ignore failures)
try {
  const statusResult = spawnSync(
    process.execPath,
    [require.resolve('./prisma-env.js'), 'prisma', 'migrate', 'status'],
    { encoding: 'utf8', env: process.env }
  );
  const output = `${statusResult.stdout || ''}${statusResult.stderr || ''}`;
  // e.g. "The `20260323999999_...` migration started at ... failed"
  const failedPattern = /The `([^`]+)` migration[^\n]*failed/gi;
  let match;
  const seen = new Set();
  while ((match = failedPattern.exec(output)) !== null) {
    const migrationName = match[1];
    if (seen.has(migrationName)) continue;
    seen.add(migrationName);
    console.log(`safe-migrate: resolving failed migration as rolled-back: ${migrationName}`);
    run(['prisma', 'migrate', 'resolve', '--rolled-back', migrationName], true);
  }
} catch (e) {
  console.warn('safe-migrate: migrate status check failed (non-fatal):', e && e.message ? e.message : e);
}

// Now deploy
console.log('Running prisma migrate deploy...');
const deployStatus = run(['prisma', 'migrate', 'deploy']);
process.exit(deployStatus);

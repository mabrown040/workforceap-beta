#!/usr/bin/env node
/**
 * Cross-platform migration runner.
 * 1. Resolves any known failed migrations (ignores errors — migration may already be clean)
 * 2. Runs prisma migrate deploy
 * 3. Exits with deploy exit code
 */
const { spawnSync } = require('child_process');

// Load prisma env vars
require('./ensure-prisma-env.cjs');

// Migrations to mark as APPLIED (tables already exist in prod DB)
const MARK_APPLIED = [
  '20260319100000_add_partner_users',
  '20260320100001_employer_portal_jobs',
];

// Migrations to mark as ROLLED BACK (never applied, safe to skip)
const MARK_ROLLED_BACK = [
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

// Now deploy
console.log('Running prisma migrate deploy...');
const deployStatus = run(['prisma', 'migrate', 'deploy']);
process.exit(deployStatus);

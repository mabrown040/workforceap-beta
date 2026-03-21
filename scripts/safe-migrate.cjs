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

// Migrations known to have failed in production — mark as rolled-back so deploy can proceed
const FAILED_MIGRATIONS = [
  '20260319100000_add_partner_users',
  '20260320100001_employer_portal_jobs',
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

// Attempt to resolve each failed migration (silently ignore if already resolved)
for (const migration of FAILED_MIGRATIONS) {
  console.log(`Attempting to resolve failed migration: ${migration}`);
  run(['prisma', 'migrate', 'resolve', '--rolled-back', migration], true);
}

// Now deploy
console.log('Running prisma migrate deploy...');
const deployStatus = run(['prisma', 'migrate', 'deploy']);
process.exit(deployStatus);

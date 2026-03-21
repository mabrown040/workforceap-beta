#!/usr/bin/env node
/**
 * Resolve a failed Prisma migration so it can be retried.
 * Run this when deploy fails with "A migration failed to apply" (P3018).
 *
 * Usage (with production DB URL):
 *   POSTGRES_PRISMA_URL="postgresql://..." node scripts/resolve-failed-migration.cjs
 *
 * Or from Vercel: copy POSTGRES_PRISMA_URL from project env, then run locally.
 */
require('./ensure-prisma-env.cjs');

if (!process.env.POSTGRES_PRISMA_URL || process.env.__PRISMA_PLACEHOLDER_DB === '1') {
  console.error('Set POSTGRES_PRISMA_URL (or DATABASE_URL) to your production database.');
  process.exit(1);
}

const { spawnSync } = require('child_process');
const migrationName = '20260320100000_employer_portal_jobs';

console.log(`Marking migration "${migrationName}" as rolled back...`);
const r = spawnSync(
  'npx',
  ['prisma', 'migrate', 'resolve', '--rolled-back', migrationName],
  { stdio: 'inherit', env: process.env }
);

if (r.status !== 0) {
  console.error('Failed. Ensure the migration name is correct and DB is reachable.');
  process.exit(1);
}

console.log('Done. You can now redeploy (migrate deploy will retry the migration).');

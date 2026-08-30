#!/usr/bin/env node
/**
 * scripts/resolve-failed-migration.cjs
 *
 * One-time production recovery for the failed migration
 * 20260614180000_s2_compliance_guc_nullif_xapi_org.
 *
 * Problem: the migration referenced xs.actor_identifier — a column that does
 * not exist on xapi_statements. The correct column is actor_account_name.
 *
 * The migration file has been fixed in the repo. This script marks the failed
 * migration as rolled-back in the _prisma_migrations table so that the fixed
 * file (and subsequent migrations) can apply on the next deploy.
 *
 * Usage (Vercel build or local with DATABASE_URL):
 *   node scripts/resolve-failed-migration.cjs
 *
 * Safety:
 *   - Only acts on the specific known-bad migration name.
 *   - Idempotent: safe to run multiple times.
 *   - Exits 0 if no action needed (migration not found, already applied, or
 *     not in a failed state — Prisma P3012).
 */

require('./ensure-prisma-env.cjs');

if (process.env.__PRISMA_PLACEHOLDER_DB === '1') {
  console.log('resolve-failed-migration: no real DB configured — skipping');
  process.exit(0);
}

const { spawnSync } = require('child_process');
const { isBenignMigrateResolveError } = require('./lib/prisma-resolve-benign.cjs');

const FAILED_MIGRATION = '20260614180000_s2_compliance_guc_nullif_xapi_org';

function runPrismaResolve() {
  // Pass a single shell string so npx + args stay one -c command (shell:true
  // with an argv array only runs the first token as the script body).
  const r = spawnSync(
    `npx prisma migrate resolve --rolled-back ${FAILED_MIGRATION}`,
    {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
      shell: true,
      encoding: 'utf8',
    },
  );
  const stdout = (r.stdout ?? '').toString();
  const stderr = (r.stderr ?? '').toString();
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  return { status: r.status ?? 1, stdout, stderr };
}

console.log(`resolve-failed-migration: attempting to roll back ${FAILED_MIGRATION}...`);
const result = runPrismaResolve();

if (result.status === 0) {
  console.log(`resolve-failed-migration: ${FAILED_MIGRATION} marked as rolled-back.`);
  console.log('  Next deploy will re-run the fixed migration and apply subsequent ones.');
  process.exit(0);
}

// Healthy / already-resolved migrations must not fail the build (P3012).
if (isBenignMigrateResolveError(result.stdout, result.stderr, '--rolled-back')) {
  console.log(
    `resolve-failed-migration: ${FAILED_MIGRATION} is not in a failed state (already resolved, applied, or never failed). Skipping.`,
  );
  process.exit(0);
}

console.error(`resolve-failed-migration: failed with status ${result.status}`);
process.exit(result.status);

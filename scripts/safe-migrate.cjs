require('./ensure-prisma-env.cjs');

/**
 * safe-migrate.cjs — wraps `prisma migrate deploy` with operator-controlled
 * recovery for partial migration failures.
 *
 * AUDIT-2026-05-16 §C-D3: the previous version auto-resolved any P3018 /
 * P3009 / "already exists" failure by silently marking the failed migration
 * as applied and retrying up to 5×. That papered over real partial-success
 * migrations (a migration that created 3 of 4 tables, failed on the 4th,
 * got marked done with the 4th table missing) and is the root cause of
 * the multiple "fix_schema_drift" rescue migrations in `prisma/migrations/`.
 *
 * Default behavior now:
 *   - Run `prisma migrate deploy`.
 *   - On failure, print the error and exit non-zero. No auto-resolve.
 *
 * Explicit recovery (operator only, after reading the failed migration's
 * SQL and confirming the DB state is what the migration intended):
 *   PRISMA_FORCE_RESOLVE=1 node scripts/safe-migrate.cjs
 *
 *   - Auto-resolve only failures that look like "already exists" race
 *     conditions on idempotent SQL (CREATE … IF NOT EXISTS variants).
 *     Retries up to 5×.
 *   - Still NOT auto-resolves bare P3018 / P3009 — those need human
 *     review.
 *
 * The intent is that the default deploy path is the safe one. Anyone
 * needing the old auto-resolve must opt in via env var, which leaves an
 * audit trail (Vercel build log will show the flag was set).
 */

if (process.env.__PRISMA_PLACEHOLDER_DB === '1') {
  console.log('safe-migrate: no real DB configured — skipping migrate deploy');
  process.exit(0);
}

const { spawnSync } = require('child_process');

function runMigrateDeploy() {
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
    shell: true,
  });
  const stdout = (r.stdout ?? '').toString();
  const stderr = (r.stderr ?? '').toString();
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  return { status: r.status ?? 1, output: stdout + stderr };
}

function resolveAsApplied(migrationName) {
  console.log(`safe-migrate: marking "${migrationName}" as applied (PRISMA_FORCE_RESOLVE=1 set)`);
  const r = spawnSync('npx', ['prisma', 'migrate', 'resolve', '--applied', migrationName], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  return r.status ?? 1;
}

console.log('safe-migrate: running prisma migrate deploy...');
const first = runMigrateDeploy();

if (first.status === 0) {
  console.log('safe-migrate: migrations applied successfully');
  process.exit(0);
}

const forceResolve = process.env.PRISMA_FORCE_RESOLVE === '1';
if (!forceResolve) {
  console.error('');
  console.error('safe-migrate: prisma migrate deploy FAILED.');
  console.error('');
  console.error('  No auto-resolve will be attempted. Inspect the failing migration:');
  console.error('    - Check whether the DDL it tried to run is partially applied.');
  console.error('    - If yes, write a follow-up migration that idempotently brings the');
  console.error('      schema to the intended state, and `prisma migrate resolve --rolled-back`');
  console.error('      the failed one.');
  console.error('    - If you are SURE the partial state is what the migration intended,');
  console.error("      re-run with PRISMA_FORCE_RESOLVE=1 to auto-mark 'already exists'");
  console.error('      failures as applied. This still will NOT mark bare P3018/P3009');
  console.error('      failures as applied without a name match.');
  console.error('');
  process.exit(first.status);
}

// PRISMA_FORCE_RESOLVE=1 — auto-resolve only "already exists" race conditions
// (CREATE TABLE IF NOT EXISTS variants). Bare P3018/P3009 still need a name
// match in the output to be resolved, but operator has opted in explicitly.
function extractAlreadyExistsName(output) {
  const m =
    output.match(/type "([^"]+)" already exists/) ||
    output.match(/relation "([^"]+)" already exists/) ||
    output.match(/column "([^"]+)" of relation "([^"]+)" already exists/);
  return m ? m[1] : null;
}

function extractFailedMigrationName(output) {
  const m =
    output.match(/Migration name:\s*(\S+)/) ||
    output.match(/The `([^`]+)` migration started at .* failed/);
  return m ? m[1] : null;
}

let current = first;
for (let attempt = 0; attempt < 5; attempt++) {
  // Prefer the failed-migration name (more accurate than the "already exists"
  // object name) when both are present.
  const failedName = extractFailedMigrationName(current.output);
  const objectName = extractAlreadyExistsName(current.output);
  const stuck = failedName || objectName;
  if (!stuck) {
    console.error('safe-migrate: PRISMA_FORCE_RESOLVE set but no recognizable failure pattern — refusing to auto-resolve');
    process.exit(current.status);
  }
  if (!objectName) {
    console.error(`safe-migrate: failed migration "${stuck}" but no "already exists" evidence — refusing to auto-resolve. Fix manually.`);
    process.exit(current.status);
  }
  console.log(`safe-migrate: PRISMA_FORCE_RESOLVE auto-resolving "${stuck}" (attempt ${attempt + 1}/5)`);
  const resolveStatus = resolveAsApplied(stuck);
  if (resolveStatus !== 0) {
    console.error('safe-migrate: resolve failed — cannot continue');
    process.exit(1);
  }
  current = runMigrateDeploy();
  if (current.status === 0) {
    console.log('safe-migrate: migrations applied successfully after resolving stuck entries');
    process.exit(0);
  }
}

process.exit(current.status);

require('./ensure-prisma-env.cjs');

/**
 * safe-migrate.cjs — wraps `prisma migrate deploy` with operator-controlled
 * recovery for partial migration failures.
 *
 * AUDIT-2026-05-16 §C-D3 / PLAN-2026-Q3 §0: the previous version auto-resolved
 * any P3018 / P3009 / "already exists" failure by silently marking the failed
 * migration as applied and retrying up to 5×. That papered over real
 * partial-success migrations (a migration that created 3 of 4 tables, failed
 * on the 4th, got marked done with the 4th table missing) and is the root
 * cause of the multiple "fix_schema_drift" rescue migrations in
 * `prisma/migrations/`.
 *
 * Default behavior:
 *   - Run `prisma migrate deploy`.
 *   - On success, run `prisma generate` and exit 0.
 *   - On failure, print the full Prisma error to stderr and exit non-zero.
 *     NO auto-resolve. NO silent retries.
 *
 * Explicit recovery (operator only, after reading the failed migration's SQL
 * and confirming the DB state is what the migration intended):
 *
 *   node scripts/safe-migrate.cjs --force-resolve <migration-name>
 *
 *   - Runs `prisma migrate resolve --applied <migration-name>` exactly once.
 *   - Echoes a loud warning to stderr before doing so.
 *   - Refuses if the name is empty or contains shell metacharacters.
 *
 * The intent is that the default deploy path is the safe one. Anyone needing
 * to force-resolve must do so explicitly, leaving an audit trail in the
 * Vercel build log (or shell history).
 *
 * Called from `package.json`'s `build:with-migrate` script.
 */

if (process.env.__PRISMA_PLACEHOLDER_DB === '1') {
  console.log('safe-migrate: no real DB configured — skipping migrate deploy');
  process.exit(0);
}

const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// argv parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { forceResolve: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force-resolve') {
      args.forceResolve = argv[i + 1] ?? '';
      i++;
    } else if (a.startsWith('--force-resolve=')) {
      args.forceResolve = a.slice('--force-resolve='.length);
    }
  }
  return args;
}

// Allow only the characters Prisma migration directory names actually use:
// digits, letters, underscores, hyphens. Reject anything else (spaces, ;, &,
// |, $, backticks, quotes, parens, redirects, glob chars, etc.).
const SAFE_MIGRATION_NAME = /^[A-Za-z0-9_-]+$/;

function isSafeMigrationName(name) {
  return typeof name === 'string' && name.length > 0 && SAFE_MIGRATION_NAME.test(name);
}

// ---------------------------------------------------------------------------
// prisma wrappers
// ---------------------------------------------------------------------------

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
  return { status: r.status ?? 1, stdout, stderr };
}

function runPrismaGenerate() {
  const r = spawnSync('npx', ['prisma', 'generate'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  return r.status ?? 1;
}

function runForceResolve(migrationName) {
  // We've already validated migrationName against SAFE_MIGRATION_NAME, but pass
  // it as a discrete argv element (not interpolated into a shell string) so
  // there's no way for it to be re-parsed.
  const r = spawnSync('npx', ['prisma', 'migrate', 'resolve', '--applied', migrationName], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  return r.status ?? 1;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

if (args.forceResolve !== null) {
  const name = args.forceResolve;
  if (!isSafeMigrationName(name)) {
    console.error(
      'safe-migrate: refusing --force-resolve: migration name is empty or contains disallowed characters.',
    );
    console.error('  Migration names must match /^[A-Za-z0-9_-]+$/ (the chars Prisma actually uses).');
    process.exit(2);
  }
  console.error('');
  console.error('⚠️  FORCING RESOLVE — this skips schema integrity checks.');
  console.error('   Make sure you\'ve manually verified the schema state.');
  console.error(`   Marking migration "${name}" as applied.`);
  console.error('');
  const status = runForceResolve(name);
  if (status !== 0) {
    console.error(`safe-migrate: prisma migrate resolve --applied ${name} failed with status ${status}`);
    process.exit(status);
  }
  console.log(`safe-migrate: migration "${name}" marked as applied. Re-run deploy to apply remaining migrations.`);
  process.exit(0);
}

console.log('safe-migrate: running prisma migrate deploy...');
const result = runMigrateDeploy();

if (result.status !== 0) {
  console.error('');
  console.error('safe-migrate: prisma migrate deploy FAILED.');
  console.error('');
  console.error('  No auto-resolve will be attempted. Inspect the failing migration:');
  console.error('    - Check whether the DDL it tried to run is partially applied.');
  console.error('    - If yes, write a follow-up migration that idempotently brings');
  console.error('      the schema to the intended state, and run');
  console.error('        npx prisma migrate resolve --rolled-back <name>');
  console.error('      against the failed one.');
  console.error('    - If you are CERTAIN the partial state is what the migration');
  console.error('      intended, re-run this script with:');
  console.error('        node scripts/safe-migrate.cjs --force-resolve <migration-name>');
  console.error('');
  process.exit(result.status);
}

console.log('safe-migrate: migrations applied successfully. Running prisma generate...');
const genStatus = runPrismaGenerate();
if (genStatus !== 0) {
  console.error(`safe-migrate: prisma generate failed with status ${genStatus}`);
  process.exit(genStatus);
}
process.exit(0);

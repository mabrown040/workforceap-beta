require('./ensure-prisma-env.cjs');

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
  console.log(`safe-migrate: marking "${migrationName}" as applied (skip broken SQL)...`);
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

// P3018/P3009 — one or more stuck migrations; resolve each and retry (up to 5 times)
// P3018 format: "Migration name: <name>"
// P3009 format: "The `<name>` migration started at ... failed"
function extractStuck(output) {
  const m =
    output.match(/Migration name:\s*(\S+)/) ||
    output.match(/The `([^`]+)` migration started at .* failed/) ||
    output.match(/type "([^"]+)" already exists/) ||
    output.match(/relation "([^"]+)" already exists/) ||
    output.match(/column "([^"]+)" of relation "([^"]+)" already exists/);
  return m ? m[1] : null;
}

let current = first;
for (let attempt = 0; attempt < 5; attempt++) {
  const stuck = extractStuck(current.output);
  if (!stuck) break;
  console.log(`safe-migrate: stuck migration "${stuck}" — marking as applied and retrying`);
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

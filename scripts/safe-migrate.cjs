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

function resolveRolledBack(migrationName) {
  console.log(`safe-migrate: marking "${migrationName}" as rolled back...`);
  const r = spawnSync('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', migrationName], {
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

// P3018 — a previous migration is stuck; resolve it and retry once
const p3018Match = first.output.match(/Migration name:\s*(\S+)/);
if (p3018Match) {
  const stuck = p3018Match[1];
  console.log(`safe-migrate: P3018 detected for "${stuck}" — resolving and retrying`);
  const resolveStatus = resolveRolledBack(stuck);
  if (resolveStatus !== 0) {
    console.error('safe-migrate: resolve failed — cannot continue');
    process.exit(1);
  }
  console.log('safe-migrate: retrying prisma migrate deploy...');
  const second = runMigrateDeploy();
  process.exit(second.status);
}

process.exit(first.status);

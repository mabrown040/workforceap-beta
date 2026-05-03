require('./ensure-prisma-env.cjs');

if (process.env.__PRISMA_PLACEHOLDER_DB === '1') {
  console.log('safe-migrate: no real DB configured — skipping migrate deploy');
  process.exit(0);
}

const { spawnSync } = require('child_process');
console.log('safe-migrate: running prisma migrate deploy...');
const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
process.exit(r.status ?? 1);

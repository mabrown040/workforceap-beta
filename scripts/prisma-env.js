#!/usr/bin/env node
// Ensures POSTGRES_* env vars exist for Prisma (Vercel/Supabase integration uses these)
// Falls back to DATABASE_URL for local dev; placeholder when unset (CI / fresh clone)
// Usage: node scripts/prisma-env.js <command> [args...]

require('./ensure-prisma-env.cjs');

const [cmd, ...args] = process.argv.slice(2);
if (cmd) {
  if (
    cmd === 'prisma' &&
    args[0] === 'migrate' &&
    args[1] === 'deploy' &&
    process.env.__PRISMA_PLACEHOLDER_DB === '1'
  ) {
    console.warn('prisma-env: skipping prisma migrate deploy (no DATABASE_URL / POSTGRES_* configured)');
    process.exit(0);
  }
  const { spawnSync } = require('child_process');
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  process.exit(r.status ?? 1);
}

#!/usr/bin/env node
// Ensures POSTGRES_* env vars exist for Prisma (Vercel/Supabase integration uses these)
// Falls back to DATABASE_URL for local dev; placeholder when unset (CI / fresh clone)
// Usage: node scripts/prisma-env.js <command> [args...]

require('./ensure-prisma-env.cjs');

const { spawnSync } = require('child_process');

const [cmd, ...args] = process.argv.slice(2);

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Intentional busy wait: short sleeps only used during build-time retries.
  }
}

function runNpx(spawnArgs, options = {}) {
  return spawnSync('npx', spawnArgs, {
    env: process.env,
    shell: true,
    ...options,
  });
}

function runWithGenerateRetry(spawnArgs) {
  const maxAttempts = 4;
  const retryDelaysMs = [500, 1200, 2500];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = runNpx(spawnArgs, { encoding: 'utf8', stdio: 'pipe' });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    const stderr = result.stderr || '';
    const lockRenameError =
      stderr.includes('EPERM: operation not permitted, rename') &&
      stderr.includes('node_modules\\.prisma\\client\\query_engine-windows.dll.node');

    if ((result.status ?? 1) === 0 || !lockRenameError || attempt === maxAttempts) {
      return result;
    }

    const delay = retryDelaysMs[attempt - 1] ?? 3000;
    console.warn(
      `prisma-env: detected Windows file lock on Prisma engine (attempt ${attempt}/${maxAttempts}); retrying in ${delay}ms...`
    );
    sleep(delay);
  }

  return { status: 1 };
}

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

  // Use npx to resolve local binaries (e.g. prisma) when not running via npm script.
  // On some hosts npm script PATH injection does not survive nested node spawns.
  const spawnArgs = cmd === 'npx' ? args : [cmd, ...args];
  const shouldRetryGenerate = cmd === 'prisma' && args[0] === 'generate';
  const result = shouldRetryGenerate
    ? runWithGenerateRetry(spawnArgs)
    : runNpx(spawnArgs, { stdio: 'inherit' });

  process.exit(result.status ?? 1);
}

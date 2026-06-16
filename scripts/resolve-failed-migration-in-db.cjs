#!/usr/bin/env node
/**
 * resolve-failed-migration-in-db.cjs
 *
 * Resolves a failed migration in the Prisma migrations table.
 * This is needed when a migration has been marked as failed in the database
 * but the actual schema changes are either:
 * 1. Already applied (partially or fully) — we mark it as applied
 * 2. Not needed anymore — we mark it as rolled back
 *
 * Usage: node scripts/resolve-failed-migration-in-db.cjs <migration-name> [--applied|--rolled-back]
 */

const { execSync } = require('child_process');
const path = require('path');

const migrationName = process.argv[2];
const resolution = process.argv[3] || '--rolled-back';

if (!migrationName) {
  console.error('Usage: node scripts/resolve-failed-migration-in-db.cjs <migration-name> [--applied|--rolled-back]');
  process.exit(1);
}

if (!['--applied', '--rolled-back'].includes(resolution)) {
  console.error('Resolution must be --applied or --rolled-back');
  process.exit(1);
}

console.log(`Resolving migration ${migrationName} as ${resolution.replace('--', '')}...`);

try {
  const result = execSync(
    `npx prisma migrate resolve ${resolution} ${migrationName}`,
    {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' },
    }
  );
  console.log(result);
  console.log(`Migration ${migrationName} resolved successfully.`);
  process.exit(0);
} catch (error) {
  const output = (error.stdout || '') + (error.stderr || '');
  
  // If the migration is already resolved, that's fine
  if (output.includes('already') || output.includes('not found') || output.includes('does not exist')) {
    console.log(`Migration ${migrationName} is already resolved or does not need resolution.`);
    process.exit(0);
  }
  
  console.error(`Failed to resolve migration ${migrationName}:`);
  console.error(output);
  process.exit(1);
}

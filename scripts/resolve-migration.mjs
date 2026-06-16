#!/usr/bin/env node
/**
 * Safe migration resolver for production.
 * Marks a failed migration as rolled back so subsequent migrations can apply.
 *
 * Usage: node scripts/resolve-migration.mjs <migration-name> [--apply-fix]
 */

const migrationName = process.argv[2];
const shouldApplyFix = process.argv.includes('--apply-fix');

if (!migrationName) {
  console.error('Usage: node scripts/resolve-migration.mjs <migration-name> [--apply-fix]');
  process.exit(1);
}

console.log(`Resolving migration: ${migrationName}`);

import { execSync } from 'child_process';

// Step 1: Mark the failed migration as rolled back
console.log('Step 1: Marking failed migration as rolled back...');
try {
  execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
    stdio: 'inherit',
    env: { ...process.env, PRISMA_CLI_QUERY_ENGINE_TYPE: 'library' }
  });
  console.log('✅ Migration marked as rolled back');
} catch (e) {
  console.error('❌ Failed to mark migration as rolled back:', e.message);
  process.exit(1);
}

// Step 2: Apply the fix migration if requested
if (shouldApplyFix) {
  console.log('Step 2: Running prisma migrate deploy...');
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, PRISMA_CLI_QUERY_ENGINE_TYPE: 'library' }
    });
    console.log('✅ Migrations applied successfully');
  } catch (e) {
    console.error('❌ Migration deploy failed:', e.message);
    process.exit(1);
  }
}

console.log('Done.');

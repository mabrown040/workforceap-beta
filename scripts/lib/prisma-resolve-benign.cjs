#!/usr/bin/env node
/**
 * Shared helpers for Prisma migrate resolve recovery scripts.
 *
 * `prisma migrate resolve --rolled-back` / `--applied` only succeeds when the
 * named migration is currently in a *failed* state. On healthy deploys the
 * same one-shot recovery commands return P3012 ("not in a failed state").
 * That must be treated as success so `build:with-migrate` stays idempotent.
 */

/**
 * @param {string} stdout
 * @param {string} stderr
 * @returns {boolean}
 */
function isBenignMigrateResolveError(stdout, stderr) {
  const combined = `${stdout ?? ''}\n${stderr ?? ''}`.toLowerCase();
  return (
    combined.includes('p3012') ||
    combined.includes('not in a failed state') ||
    combined.includes('already resolved') ||
    combined.includes('already been recorded') ||
    combined.includes('not found') ||
    combined.includes('does not exist') ||
    combined.includes('no failed migration')
  );
}

module.exports = { isBenignMigrateResolveError };

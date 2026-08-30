#!/usr/bin/env node
/**
 * Shared helpers for Prisma migrate resolve recovery scripts.
 *
 * `prisma migrate resolve --rolled-back` / `--applied` only succeeds when the
 * named migration is currently in a *failed* state. On healthy deploys the
 * same one-shot recovery commands return P3012 ("not in a failed state"). A
 * rollback-only recovery can also return P3011 when the migration was never
 * applied. Those states must be treated as success so `build:with-migrate`
 * stays idempotent, without hiding P3011 from an `--applied` operation.
 */

/**
 * @param {string} stdout
 * @param {string} stderr
 * @param {'--applied'|'--rolled-back'|undefined} resolution
 * @returns {boolean}
 */
function isBenignMigrateResolveError(stdout, stderr, resolution) {
  const combined = `${stdout ?? ''}\n${stderr ?? ''}`.toLowerCase();
  return (
    combined.includes('p3012') ||
    (resolution === '--rolled-back' && (
      combined.includes('p3011') ||
      combined.includes('was never applied')
    )) ||
    combined.includes('not in a failed state') ||
    combined.includes('already resolved') ||
    combined.includes('already been recorded') ||
    combined.includes('not found') ||
    combined.includes('does not exist') ||
    combined.includes('no failed migration')
  );
}

module.exports = { isBenignMigrateResolveError };

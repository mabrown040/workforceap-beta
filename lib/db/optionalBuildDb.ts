/**
 * During `npm run build`, optional DB reads should stay off unless explicitly enabled.
 * This keeps build-time data collection from hitting a real database and failing on
 * missing tenants, credentials, or preview-only environments.
 */
export function shouldSkipOptionalDbQueriesAtBuild(): boolean {
  if (process.env.WORKFORCEAP_FORCE_DB_BUILD === '1') return false;
  if (process.env.__PRISMA_PLACEHOLDER_DB === '1') return true;

  const isBuildLifecycle =
    process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build';

  if (!isBuildLifecycle) return false;

  return true;
}

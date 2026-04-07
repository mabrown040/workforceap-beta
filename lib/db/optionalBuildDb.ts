const LOOPBACK_DB_HOST_PATTERN = /@(localhost|127\.0\.0\.1)(:\d+)?\//i;

/**
 * During `npm run build`, some optional marketing/admin data fetches should not hard-fail
 * when local loopback DB URLs are configured but no local Postgres is running.
 */
export function shouldSkipOptionalDbQueriesAtBuild(): boolean {
  if (process.env.WORKFORCEAP_FORCE_DB_BUILD === '1') return false;
  if (process.env.__PRISMA_PLACEHOLDER_DB === '1') return true;

  const isBuildLifecycle =
    process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build';

  if (!isBuildLifecycle) return false;

  const dbUrl = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL ?? '';
  return LOOPBACK_DB_HOST_PATTERN.test(dbUrl);
}

/**
 * B4B/xAPI sync-drift query for /admin/coursera/health.
 *
 * Postgres has no `ABS(interval)`; the previous `ABS(a - b)` raised 42883 on
 * every page load and the catch swallowed it into an empty list that rendered
 * as "within 24h on every matched pair". The magnitude of the gap is taken as
 * `GREATEST(a, b) - LEAST(a, b)` instead, and the loader now reports failure
 * separately from an empty result so the page can say so.
 */
import { Prisma } from '@prisma/client';
import { diagnosticTenantFilter, LATEST_B4B_COURSE_PROGRESS, MATCHED_COURSE_PROGRESS } from './courseraDiagnostics';

export type SyncDriftRawRow = {
  key?: string;
  userId: string;
  email: string | null;
  courseName: string;
  localProgramSlug: string;
  courseraCourseId: string;
  b4bLastActivity: Date | null;
  ourLastActivity: Date | null;
  deltaSeconds: number | bigint | null;
};

export type SyncDriftRow = {
  key: string;
  email: string;
  courseName: string;
  localProgramSlug: string;
  b4bLastActivity: Date | null;
  ourLastActivity: Date | null;
  deltaHours: number;
};

export type SyncDriftResult =
  | { status: 'ok'; rows: SyncDriftRow[] }
  | { status: 'error'; message: string };

export const SYNC_DRIFT_THRESHOLD_HOURS = 24;
export const SYNC_DRIFT_LIMIT = 20;

/** Absolute gap between the two feeds' timestamps, as an interval. */
const GAP = Prisma.sql`GREATEST(ccp.last_activity_time, cp.last_activity_at) - LEAST(ccp.last_activity_time, cp.last_activity_at)`;

export function buildSyncDriftQuery(
  thresholdHours: number = SYNC_DRIFT_THRESHOLD_HOURS,
  limit: number = SYNC_DRIFT_LIMIT,
  organizationId: string | null = null,
): Prisma.Sql {
  // Bound parameters arrive untyped; the explicit ::int cast keeps Postgres
  // from hunting for make_interval(hours => double precision) (42883 again).
  const threshold = Prisma.sql`(${Math.max(0, Math.trunc(thresholdHours))}::int * INTERVAL '1 hour')`;
  return Prisma.sql`
    SELECT
      ccp.id || '::' || cp.id AS key,
      ccp.user_id AS "userId",
      u.email AS "email",
      ccp.course_name AS "courseName",
      cp.program_slug AS "localProgramSlug",
      ccp.coursera_course_id AS "courseraCourseId",
      ccp.last_activity_time AS "b4bLastActivity",
      cp.last_activity_at AS "ourLastActivity",
      EXTRACT(EPOCH FROM (${GAP}))::int AS "deltaSeconds"
    FROM (${LATEST_B4B_COURSE_PROGRESS}) ccp
    JOIN course_progress cp
      ON ${MATCHED_COURSE_PROGRESS}
    JOIN users u ON u.id = ccp.user_id
    WHERE ccp.user_id IS NOT NULL AND ccp.source = 'b4b_sync' AND u.deleted_at IS NULL
      AND ccp.organization_id = u.organization_id
      AND ccp.last_activity_time IS NOT NULL
      AND cp.last_activity_at IS NOT NULL
      ${diagnosticTenantFilter(organizationId)}
      AND (${GAP}) > ${threshold}
    ORDER BY (${GAP}) DESC
    LIMIT ${Math.max(1, Math.trunc(limit))}::int
  `;
}

export function mapSyncDriftRows(rows: SyncDriftRawRow[]): SyncDriftRow[] {
  return rows.map((r) => ({
    key: r.key ?? `${r.userId}::${r.courseraCourseId}`,
    email: r.email ?? '(unknown)',
    courseName: r.courseName,
    localProgramSlug: r.localProgramSlug,
    b4bLastActivity: r.b4bLastActivity,
    ourLastActivity: r.ourLastActivity,
    deltaHours: r.deltaSeconds == null ? 0 : Math.round(Number(r.deltaSeconds) / 3600),
  }));
}

/**
 * Run the drift query through `run` (normally `prisma.$queryRaw`). A thrown
 * query becomes `{ status: 'error' }` rather than an empty list, so the UI
 * never presents a failed check as an all-clear.
 */
export async function loadSyncDriftPairs(
  run: (sql: Prisma.Sql) => Promise<SyncDriftRawRow[]>,
  options: { thresholdHours?: number; limit?: number; organizationId?: string | null } = {},
): Promise<SyncDriftResult> {
  try {
    const rows = await run(buildSyncDriftQuery(options.thresholdHours, options.limit, options.organizationId));
    return { status: 'ok', rows: mapSyncDriftRows(rows) };
  } catch (error) {
    console.error('[admin/coursera/health] sync drift pairs failed:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

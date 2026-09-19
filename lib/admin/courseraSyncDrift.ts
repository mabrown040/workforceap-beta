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

export type SyncDriftRawRow = {
  userId: string;
  email: string | null;
  courseName: string;
  courseraCourseId: string;
  b4bLastActivity: Date | null;
  ourLastUpdated: Date | null;
  deltaSeconds: number | bigint | null;
};

export type SyncDriftRow = {
  key: string;
  email: string;
  courseName: string;
  b4bLastActivity: Date | null;
  ourLastUpdated: Date | null;
  deltaHours: number;
};

export type SyncDriftResult =
  | { status: 'ok'; rows: SyncDriftRow[] }
  | { status: 'error'; message: string };

export const SYNC_DRIFT_THRESHOLD_HOURS = 24;
export const SYNC_DRIFT_LIMIT = 20;

/** Absolute gap between the two feeds' timestamps, as an interval. */
const GAP = Prisma.sql`GREATEST(ccp.last_activity_time, cp.last_updated_at) - LEAST(ccp.last_activity_time, cp.last_updated_at)`;

export function buildSyncDriftQuery(
  thresholdHours: number = SYNC_DRIFT_THRESHOLD_HOURS,
  limit: number = SYNC_DRIFT_LIMIT,
): Prisma.Sql {
  // Bound parameters arrive untyped; the explicit ::int cast keeps Postgres
  // from hunting for make_interval(hours => double precision) (42883 again).
  const threshold = Prisma.sql`(${Math.max(0, Math.trunc(thresholdHours))}::int * INTERVAL '1 hour')`;
  return Prisma.sql`
    SELECT
      ccp.user_id AS "userId",
      u.email AS "email",
      ccp.course_name AS "courseName",
      ccp.coursera_course_id AS "courseraCourseId",
      ccp.last_activity_time AS "b4bLastActivity",
      cp.last_updated_at AS "ourLastUpdated",
      EXTRACT(EPOCH FROM (${GAP}))::int AS "deltaSeconds"
    FROM coursera_course_progress ccp
    JOIN course_progress cp
      ON cp.user_id = ccp.user_id
      AND cp.course_id = ccp.coursera_course_id
    JOIN users u ON u.id = ccp.user_id
    WHERE ccp.user_id IS NOT NULL
      AND ccp.last_activity_time IS NOT NULL
      AND cp.last_updated_at IS NOT NULL
      AND (${GAP}) > ${threshold}
    ORDER BY (${GAP}) DESC
    LIMIT ${Math.max(1, Math.trunc(limit))}::int
  `;
}

export function mapSyncDriftRows(rows: SyncDriftRawRow[]): SyncDriftRow[] {
  return rows.map((r) => ({
    key: `${r.userId}::${r.courseraCourseId}`,
    email: r.email ?? '(unknown)',
    courseName: r.courseName,
    b4bLastActivity: r.b4bLastActivity,
    ourLastUpdated: r.ourLastUpdated,
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
  options: { thresholdHours?: number; limit?: number } = {},
): Promise<SyncDriftResult> {
  try {
    const rows = await run(buildSyncDriftQuery(options.thresholdHours, options.limit));
    return { status: 'ok', rows: mapSyncDriftRows(rows) };
  } catch (error) {
    console.error('[admin/coursera/health] sync drift pairs failed:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

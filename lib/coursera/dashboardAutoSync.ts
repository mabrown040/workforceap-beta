import 'server-only';

import { listCourseraIdentityMappingsForUser } from '@/lib/xapi/mappings';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import {
  markUserAutoSynced,
  syncUserFromB4B,
} from './syncUserFromB4B';

/**
 * One-shot auto-sync helper for Coursera B4B → local CourseProgress.
 *
 * SCALE Phase 2: **not** called from `/dashboard` render (kit or `?ui=legacy`).
 * Hourly cron `coursera-training-sync` owns seeding. This helper remains for
 * `POST /api/member/coursera/auto-sync` (manual "sync me") and any future
 * non-render caller.
 *
 * Mirrors the gates in `POST /api/member/coursera/auto-sync` so a member who
 * has never been synced gets enrollment + xAPI seeded. Callers that still
 * invoke it should treat it as a background promise with `runWithDeadline`
 * so a slow B4B response never blocks HTML.
 *
 * Dedupe rules (must ALL pass for a sync to fire):
 *   1. User has an email on file (`users.email`).
 *   2. `users.last_coursera_auto_sync_at` is NULL or > AUTO_SYNC_BACKOFF_MS old.
 *   3. The user has zero local `CourseProgress` rows. Once any row exists,
 *      the xAPI / cron pipeline keeps things current — no need to re-sync.
 *   4. A Coursera identity mapping is on file (or the portal email matches
 *      the Coursera externalId we'll query against).
 *
 * On success the helper stamps `users.last_coursera_auto_sync_at = now()` so
 * future renders skip without re-checking. On failure (B4B outage, etc.) the
 * timestamp is also stamped — fail-soft, the caller will retry next backoff
 * window. The whole thing is wrapped in try/catch by the caller so an
 * unexpected throw never reaches the page render.
 *
 * Rationale for living in lib (not calling the route over HTTP):
 *   - Avoids a self-fetch round-trip for what is a same-process call.
 *   - The route handler remains the explicit endpoint (manual "sync me").
 */

/** 1 hour. Matches AUTO_SYNC_BACKOFF_MS in the route handler. */
const AUTO_SYNC_BACKOFF_MS = 60 * 60 * 1000;

/** 5s deadline so a slow B4B response never holds up the dashboard render. */
const AUTO_SYNC_DEADLINE_MS = 5_000;

export type DashboardAutoSyncOutcome = {
  didSync: boolean;
  reason: string;
};

/** Wrap a promise with a hard deadline. On timeout the underlying promise
 *  keeps running (we don't have AbortController plumbing across the prisma
 *  + B4B fetches) but the caller resolves with the timeout outcome — for
 *  the dashboard, that means "render with whatever local data exists".
 *  The orphaned promise eventually settles in the background and the
 *  `markUserAutoSynced` stamp inside `syncUserFromB4B`'s callsite handles
 *  the dedupe so a retry won't re-fire on the next render. */
function runWithDeadline<T>(p: Promise<T>, ms: number, timeoutValue: T): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(timeoutValue), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function runAutoSyncCore(args: {
  userId: string;
  userEmail: string | null;
}): Promise<DashboardAutoSyncOutcome> {
  if (!args.userEmail) {
    return { didSync: false, reason: 'no email on file' };
  }

  // Resolve org first so every subsequent read/write is properly tenant-scoped.
  // If the user row is gone (deleted / stale session), `getActorOrganizationId`
  // throws — treat that as "skip silently".
  let orgId: string;
  try {
    orgId = await getActorOrganizationId(args.userId);
  } catch (err) {
    console.warn(
      '[dashboardAutoSync] org lookup failed:',
      err instanceof Error ? err.message : err,
    );
    return { didSync: false, reason: 'org lookup failed' };
  }

  const dbUser = await withTenantScope(orgId, (db) =>
    db.user.findUnique({
      where: { id: args.userId },
      select: {
        id: true,
        email: true,
        enrolledProgram: true,
        lastCourseraAutoSyncAt: true,
        _count: { select: { courseProgress: true } },
      },
    }),
  );
  if (!dbUser) return { didSync: false, reason: 'user row missing' };

  // Gate #1: backoff window — don't pummel B4B on every page load.
  if (
    dbUser.lastCourseraAutoSyncAt &&
    Date.now() - dbUser.lastCourseraAutoSyncAt.getTime() < AUTO_SYNC_BACKOFF_MS
  ) {
    return { didSync: false, reason: 'within backoff window' };
  }

  // Gate #2: any local CourseProgress row → already synced previously, the
  // xAPI/cron pipeline owns updates from here on. Stamp the dedupe timestamp
  // so we don't re-check this on every render.
  if (dbUser._count.courseProgress > 0) {
    await markUserAutoSynced({ userId: dbUser.id, orgId }).catch((err) => {
      console.warn('[dashboardAutoSync] stamp after skip failed:', err);
    });
    return { didSync: false, reason: 'local CourseProgress rows exist' };
  }

  // Gate #3: must have a Coursera identity mapping (or rely on the portal
  // email as a direct externalId match). Without ANY identity, B4B can't
  // resolve the learner.
  const mappings = await listCourseraIdentityMappingsForUser(dbUser.id).catch(
    (err) => {
      console.warn('[dashboardAutoSync] mapping lookup failed:', err);
      return [] as Array<{ courseraEmail: string | null }>;
    },
  );
  const courseraEmail =
    mappings.find((m) => m.courseraEmail)?.courseraEmail ??
    dbUser.email ??
    null;
  if (!courseraEmail) {
    return { didSync: false, reason: 'no Coursera identity mapping' };
  }

  try {
    const result = await syncUserFromB4B({
      email: courseraEmail.toLowerCase(),
      wapUserId: dbUser.id,
      orgId,
      enrolledByAdmin: null,
      existingEnrolledProgram: dbUser.enrolledProgram,
    });

    await markUserAutoSynced({ userId: dbUser.id, orgId }).catch((err) => {
      console.warn('[dashboardAutoSync] stamp after success failed:', err);
    });

    return {
      didSync:
        result.mapped.seededEnrollments > 0 ||
        result.mapped.updatedEnrollments > 0,
      reason: result.message,
    };
  } catch (err) {
    console.warn(
      '[dashboardAutoSync] sync failed:',
      err instanceof Error ? err.message : err,
    );
    // Stamp the timestamp on failure too so we don't retry every render.
    await markUserAutoSynced({ userId: dbUser.id, orgId }).catch(() => {
      // non-fatal
    });
    return { didSync: false, reason: 'sync failed' };
  }
}

/**
 * Dashboard-side entry point. Fail-soft with a hard deadline:
 *   - Returns `{ didSync: false, reason: 'timeout' }` if the sync hasn't
 *     completed within AUTO_SYNC_DEADLINE_MS.
 *   - Returns `{ didSync: false, reason: 'error: ...' }` on unexpected throw.
 *   - Never throws.
 */
export async function maybeAutoSyncCourseraOnDashboard(args: {
  userId: string;
  userEmail: string | null;
}): Promise<DashboardAutoSyncOutcome> {
  try {
    return await runWithDeadline(
      runAutoSyncCore(args),
      AUTO_SYNC_DEADLINE_MS,
      { didSync: false, reason: 'timeout' },
    );
  } catch (err) {
    console.warn(
      '[dashboardAutoSync] unexpected error:',
      err instanceof Error ? err.message : err,
    );
    return {
      didSync: false,
      reason:
        err instanceof Error
          ? `error: ${err.message}`
          : 'error: unknown',
    };
  }
}

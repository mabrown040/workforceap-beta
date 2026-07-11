import 'server-only';

import { listCourseraIdentityMappingsForUser } from '@/lib/xapi/mappings';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { ensurePortalEmailIdentityLink } from './ensurePortalEmailIdentity.server';
import {
  markUserAutoSynced,
  syncUserFromB4B,
} from './syncUserFromB4B';

/**
 * One-shot auto-sync helper called from the `/dashboard` server render path.
 *
 * Mirrors the gates in `POST /api/member/coursera/auto-sync` so a member who
 * hits their dashboard for the first time — never had an admin click "Sync
 * from Coursera" on them — sees real Coursera progress immediately. The
 * dashboard treats this as a background promise: the caller `await`s it but
 * with a 5s timeout (see `runWithDeadline`) so a slow B4B response never
 * blocks the page render.
 *
 * Dedupe rules (must ALL pass for a sync to fire):
 *   1. User has an email on file (`users.email`).
 *   2. `users.last_coursera_auto_sync_at` is NULL or > AUTO_SYNC_BACKOFF_MS old.
 *   3. Within each backoff window we always run `ensurePortalEmailIdentityLink`
 *      (upsert portal-email mapping + orphan backfill + xAPI replay) so
 *      members with partial local progress still attach historical Coursera rows.
 *   4. The heavy B4B enrollment sync only runs when local `CourseProgress`
 *      is empty — once any row exists, xAPI / cron owns updates.
 *
 * On success the helper stamps `users.last_coursera_auto_sync_at = now()` so
 * future renders skip without re-checking. On failure (B4B outage, etc.) the
 * timestamp is also stamped — fail-soft, the caller will retry next backoff
 * window. The whole thing is wrapped in try/catch by the caller so an
 * unexpected throw never reaches the page render.
 *
 * Rationale for living in lib (not calling the route over HTTP):
 *   - Avoids a self-fetch round-trip for what is a same-process call.
 *   - The route handler is still useful as an explicit endpoint (manual
 *     "sync me" button, future client-side trigger), but on the server
 *     render path we just call the underlying logic directly.
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

  // Always (within backoff): bind portal email → Coursera identity, attach
  // orphaned CSV/xAPI progress rows, and replay unresolved statements. This
  // runs even when local CourseProgress already exists — otherwise members
  // with partial progress never pick up historical orphan rows.
  const identityLink = await ensurePortalEmailIdentityLink({
    userId: dbUser.id,
    email: dbUser.email,
    orgId,
  }).catch((err) => {
    console.warn('[dashboardAutoSync] identity link failed:', err);
    return null;
  });

  // Gate #2: any local CourseProgress row → heavy B4B sync already happened;
  // xAPI/cron owns updates from here on. Stamp the dedupe timestamp so we
  // don't re-check this on every render.
  if (dbUser._count.courseProgress > 0) {
    await markUserAutoSynced({ userId: dbUser.id, orgId }).catch((err) => {
      console.warn('[dashboardAutoSync] stamp after skip failed:', err);
    });
    const linked =
      identityLink &&
      (identityLink.mappingCreatedOrUpdated ||
        identityLink.backfill.courseRowsUpdated > 0 ||
        identityLink.xapiReplayed > 0);
    return {
      didSync: Boolean(linked),
      reason: linked
        ? `identity refreshed (${identityLink?.reason ?? 'ok'})`
        : 'local CourseProgress rows exist',
    };
  }

  // Gate #3: resolve Coursera externalId (mapping email or portal email).
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

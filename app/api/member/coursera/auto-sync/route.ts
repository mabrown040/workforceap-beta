import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import {
  markUserAutoSynced,
  syncUserFromB4B,
} from '@/lib/coursera/syncUserFromB4B';
import { listCourseraIdentityMappingsForUser } from '@/lib/xapi/mappings';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * POST /api/member/coursera/auto-sync
 *
 * Self-sync trigger fired from the `/dashboard` server render so a returning
 * member with a valid Coursera identity mapping but zero local CourseProgress
 * rows sees real progress on first visit. This is NOT admin-only:
 *
 *   1. Authenticated member only — only ever syncs their OWN data.
 *   2. Skipped (`didSync=false`) when the user has no Coursera identity
 *      mapping (they've never been linked, so there's nothing to pull).
 *   3. Skipped when the user already has at least one CourseProgress row
 *      OR their `lastCourseraAutoSyncAt` is fresh (≤ AUTO_SYNC_BACKOFF_MS).
 *      This is the dedupe + B4B-quota guard.
 *   4. On success the route stamps `users.last_coursera_auto_sync_at = now()`
 *      so the next dashboard render skips the call.
 *
 * Returns `{ ok: true, didSync: boolean, message: string }` so the dashboard
 * background trigger can log a one-line "synced X enrollments" or skip-reason
 * without surfacing a UI toast (auto-sync is invisible to the user — the only
 * signal is that their progress now renders accurately).
 */

/** 1 hour. The dashboard render path fires this in the background; if a user
 *  refreshes a few times in quick succession we don't want to fan out N B4B
 *  pulls. The cron / manual admin path remains the right tool for "force a
 *  refresh now". */
const AUTO_SYNC_BACKOFF_MS = 60 * 60 * 1000;

async function _POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.email) {
      return NextResponse.json(
        { ok: true, didSync: false, message: 'No email on file; cannot auto-sync.' },
        { status: 200 },
      );
    }
  
    let orgId: string;
    try {
      orgId = await getActorOrganizationId(user.id);
    } catch (err) {
      captureApiError(err, { route: 'member/coursera/auto-sync' });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    // Self-only: load the authenticated user's row directly through
    // withTenantScope so a stale auth session that points to a different org
    // can never resolve a row in this org. There is no `email` body — we
    // never let the member sync someone else's account.
    const dbUser = await withTenantScope(orgId, (db) =>
      db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          enrolledProgram: true,
          lastCourseraAutoSyncAt: true,
          organizationId: true,
          _count: { select: { courseProgress: true } },
        },
      }),
    );
    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    // Idempotency gate #1: backoff window. If we synced this user recently,
    // skip — the data is fresh enough.
    if (
      dbUser.lastCourseraAutoSyncAt &&
      Date.now() - dbUser.lastCourseraAutoSyncAt.getTime() < AUTO_SYNC_BACKOFF_MS
    ) {
      return NextResponse.json({
        ok: true,
        didSync: false,
        message: 'Auto-sync skipped — last sync was within the backoff window.',
      });
    }
  
    // Idempotency gate #2: any local CourseProgress row means this user has
    // already been synced (by an admin click, the cron, or a prior auto-sync).
    // The auto-sync trigger is for never-synced users only; once rows exist the
    // background xAPI / cron pipeline keeps them current.
    if (dbUser._count.courseProgress > 0) {
      // Stamp the timestamp anyway so we don't recheck this on every render.
      await markUserAutoSynced({ userId: dbUser.id, orgId });
      return NextResponse.json({
        ok: true,
        didSync: false,
        message: 'Auto-sync skipped — local CourseProgress rows already exist.',
      });
    }
  
    // Gate #3: must have a Coursera identity mapping. Without one the xAPI
    // pipeline doesn't know who this learner is on Coursera's side, so a B4B
    // pull would return nothing useful. (The mapping is created either by an
    // admin in /admin/integrations/xapi or auto-created when the user's first
    // xAPI statement arrives — see resolveXapiUser auto-mapping.)
    const mappings = await listCourseraIdentityMappingsForUser(dbUser.id).catch(
      (err) => {
        console.warn('[auto-sync] mapping lookup failed:', err);
        return [] as Array<{ courseraEmail: string | null }>;
      },
    );
    const courseraEmail =
      mappings.find((m) => m.courseraEmail)?.courseraEmail ?? dbUser.email;
    if (!courseraEmail) {
      return NextResponse.json({
        ok: true,
        didSync: false,
        message: 'Auto-sync skipped — no Coursera identity mapping on file.',
      });
    }
  
    // ── Run the sync ──
    try {
      const result = await syncUserFromB4B({
        email: courseraEmail.toLowerCase(),
        wapUserId: dbUser.id,
        orgId,
        // Self-sync: not admin-driven; CourseEnrollment.enrolledByAdminId
        // stays null on freshly seeded rows so audit logs make it clear this
        // wasn't a manual admin action.
        enrolledByAdmin: null,
        existingEnrolledProgram: dbUser.enrolledProgram,
      });
  
      // Stamp the dedupe timestamp regardless of how much was synced — even a
      // "no enrollments matched" run has paid the B4B quota cost and we don't
      // want to re-fire on every render.
      await markUserAutoSynced({ userId: dbUser.id, orgId });
  
      return NextResponse.json({
        ok: true,
        didSync:
          result.mapped.seededEnrollments > 0 ||
          result.mapped.updatedEnrollments > 0,
        message: result.message,
      });
    } catch (err) {
      captureApiError(err, { route: 'member/coursera/auto-sync' });
      // Fail-soft: even on B4B outage we stamp the timestamp so we don't
      // re-hammer a failing upstream — caller will retry next backoff window.
      await markUserAutoSynced({ userId: dbUser.id, orgId }).catch(() => {
        // Stamp failure is non-fatal; the dashboard render still succeeded.
      });
      return NextResponse.json(
        {
          ok: false,
          didSync: false,
          message:
            err instanceof Error
              ? `Auto-sync failed: ${err.message}`
              : 'Auto-sync failed',
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('/member/coursera/auto-sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

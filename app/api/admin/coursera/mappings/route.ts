import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import {
  listCourseraIdentityMappings,
  listRecentUnmatchedXapiEvents,
} from '@/lib/xapi/mappings';
import { reprocessUnmatchedXapiEvents } from '@/lib/xapi/reprocess';
import { replayUnresolvedXapiStatementsForIdentity } from '@/lib/coursera/replayPendingXapi';
import { mapCourseraIdentityAndProgress } from '@/lib/coursera/mapIdentityAndProgress.server';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return null;
  }
  return user;
}

async function requireAdminContext() {
  const user = await requireAdminUser();
  if (!user) return null;
  return {
    user,
    organizationId: await getActorOrganizationId(user.id),
  };
}

async function _GET(request: Request) {
  try {
    const ctx = await requireAdminContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('unmatchedLimit') || '50');
    const unmatchedLimit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 200)
      : 50;
  
    try {
      const [mappings, unmatchedEvents] = await Promise.all([
        listCourseraIdentityMappings({ organizationId: ctx.organizationId }),
        listRecentUnmatchedXapiEvents(unmatchedLimit, { organizationId: ctx.organizationId }),
      ]);
  
      return NextResponse.json({
        mappings,
        unmatchedEvents,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Coursera mapping data';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/coursera/mappings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _POST(request: Request) {
  try {
    const ctx = await requireAdminContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    let body: {
      userId?: string;
      courseraEmail?: string;
      actorIdentifier?: string;
      actorHomePage?: string;
      notes?: string;
    };
  
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    if (!body.userId?.trim()) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
  
    if (!body.courseraEmail?.trim() && !body.actorIdentifier?.trim()) {
      return NextResponse.json({ error: 'courseraEmail or actorIdentifier is required' }, { status: 400 });
    }
  
    try {
      const mapped = await mapCourseraIdentityAndProgress({
        userId: body.userId.trim(),
        organizationId: ctx.organizationId,
        courseraEmail: body.courseraEmail,
        actorIdentifier: body.actorIdentifier,
        actorHomePage: body.actorHomePage,
        notes: body.notes,
        createdByUserId: ctx.user.id,
        source: 'manual-admin-api',
      });
  
      // Re-process unmatched xAPI events that might now match this mapping.
      // Two pipelines run in parallel because each catches a different failure
      // mode the other misses:
      //   - `reprocessUnmatchedXapiEvents` walks `coursera_xapi_events` rows
      //     stored as 'unmatched' / 'error' (events that hit ingest before
      //     the mapping existed)
      //   - `replayUnresolvedXapiStatementsForIdentity` walks
      //     `xapi_statements` directly, which catches statements whose
      //     pipeline run never wrote a `coursera_xapi_events` row (early
      //     failures) and statements that were already marked processed.
      // Without the second pass, saving a mapping for a learner whose
      // historical events were short-circuited before `recordXapiEvent`
      // would not credit any progress.
      let reprocessResult;
      try {
        reprocessResult = await reprocessUnmatchedXapiEvents({
          userId: body.userId.trim(),
          courseraEmail: body.courseraEmail,
          actorIdentifier: body.actorIdentifier,
          limit: 50,
        });
      } catch (reprocessError) {
        console.error('[admin/coursera/mappings] reprocess failed:', reprocessError);
        reprocessResult = { processed: 0, matched: 0, errors: 0, details: [] };
      }
  
      let xapiReplay;
      try {
        xapiReplay = await replayUnresolvedXapiStatementsForIdentity({
          courseraEmail: body.courseraEmail,
          actorIdentifier: body.actorIdentifier,
        });
      } catch (replayError) {
        console.error('[admin/coursera/mappings] xapi replay failed:', replayError);
        xapiReplay = null;
      }
  
      void auditLog({ actorUserId: ctx.user.id, action: 'admin_coursera_mapping_saved', targetType: 'User', targetId: body.userId?.trim() ?? ctx.user.id, metadata: {} }).catch(() => {});
      logAuditEvent({ user: { id: ctx.user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraIdentityMapping', id: body.userId?.trim() ?? ctx.user.id }, result: { success: true } }).catch(() => {});
      return NextResponse.json({
        ok: true,
        mapping: mapped.mapping,
        backfill: mapped.backfill,
        reprocessed: reprocessResult,
        xapiReplay,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save Coursera mapping';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    console.error('/admin/coursera/mappings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiGuc(_GET);
export const POST = withApiGuc(_POST);

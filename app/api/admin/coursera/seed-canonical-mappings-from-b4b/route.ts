import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import { seedCanonicalMappingsFromB4B } from '@/lib/coursera/seedCanonicalMappingsFromB4B';
import { loadB4BContents } from '@/lib/coursera/programContentsCache';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * POST /api/admin/coursera/seed-canonical-mappings-from-b4b
 *
 * Companion to `seed-canonical-mappings-from-catalog` that pulls the live
 * B4B program directory (`listPrograms({ excludeContent: false })`) and
 * upserts a `CourseraCanonicalCourseMapping` for every course in every
 * matched program. See `lib/coursera/seedCanonicalMappingsFromB4B.ts` for
 * the matching logic.
 *
 * Auth: super_admin OR admin in the actor's org. Mirrors the catalog seeder.
 *
 * Returns a per-program breakdown so the UI can show which catalog programs
 * still need attention (manual `courseraB4BProgramId` binding).
 */
async function _POST(_request: NextRequest) {
  try {
    const actor = await getUser();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    let orgId: string;
    try {
      orgId = await getActorOrganizationId(actor.id);
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/seed-canonical-mappings-from-b4b' });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const superAdmin = await isSuperAdmin(actor.id);
    if (!superAdmin && !(await isAdminInOrg(actor.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    try {
      const contents = await loadB4BContents();
      const summary = await seedCanonicalMappingsFromB4B({ actorUserId: actor.id, contents });
      void auditLog({ actorUserId: actor.id, action: 'admin_coursera_seed_mappings_b4b', targetType: 'User', targetId: actor.id, metadata: {} }).catch(() => {});
      logAuditEvent({ user: { id: actor.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraSeedMappingsB4B', id: actor.id }, result: { success: true } }).catch(() => {});
      return NextResponse.json(summary);
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/seed-canonical-mappings-from-b4b' });
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Seed canonical mappings from B4B failed',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('/admin/coursera/seed-canonical-mappings-from-b4b:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiGuc(_POST);

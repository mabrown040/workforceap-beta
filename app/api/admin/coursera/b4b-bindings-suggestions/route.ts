import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import { getBindingSuggestions } from '@/lib/coursera/b4bBindingSuggestions.server';
import { renderPatchHint } from '@/lib/coursera/b4bBindingSuggestions';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * GET /api/admin/coursera/b4b-bindings-suggestions
 *
 * Returns name-match suggestions between the static `PROGRAMS` catalog and
 * the live B4B program directory. Each row carries a confidence level
 * (exact / partial / none) plus an `alreadyBound` flag so the admin UI can
 * highlight rows that need attention.
 *
 * Also returns `patchHint` — a copy-pasteable TypeScript snippet that
 * populates `Program.courseraB4BProgramId` for every exact match. Engineers
 * paste it into `lib/content/programs.ts` (or the future DB-backed
 * bindings table) to lock in the match.
 *
 * Auth: super_admin OR admin in the actor's org.
 */
async function _GET() {
  try {
    const actor = await getUser();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    let orgId: string;
    try {
      orgId = await getActorOrganizationId(actor.id);
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/b4b-bindings-suggestions' });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const superAdmin = await isSuperAdmin(actor.id);
    if (!superAdmin && !(await isAdminInOrg(actor.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    try {
      const report = await getBindingSuggestions();
      return NextResponse.json({
        ...report,
        patchHint: renderPatchHint(report),
      });
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/b4b-bindings-suggestions' });
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Failed to compute B4B binding suggestions',
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('/admin/coursera/b4b-bindings-suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiGuc(_GET);

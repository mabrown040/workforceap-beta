import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import { getBindingSuggestions } from '@/lib/coursera/b4bBindingSuggestions.server';
import { renderPatchHint } from '@/lib/coursera/b4bBindingSuggestions';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async () => {
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
});

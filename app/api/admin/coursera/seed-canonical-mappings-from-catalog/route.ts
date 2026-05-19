import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import { seedCanonicalMappingsFromCatalog } from '@/lib/coursera/seedCanonicalMappingsFromCatalog';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withRouteObservability } from '@/lib/api/routeObservability';export const POST = withRouteObservability(async (_request: NextRequest) => {
  try {
    const actor = await getUser();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    let orgId: string;
    try {
      orgId = await getActorOrganizationId(actor.id);
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/seed-canonical-mappings-from-catalog' });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const superAdmin = await isSuperAdmin(actor.id);
    if (!superAdmin && !(await isAdminInOrg(actor.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    try {
      const summary = await seedCanonicalMappingsFromCatalog({ actorUserId: actor.id });
      return NextResponse.json(summary);
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/seed-canonical-mappings-from-catalog' });
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Seed canonical mappings failed',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('/admin/coursera/seed-canonical-mappings-from-catalog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

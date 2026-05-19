import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withRouteObservability } from '@/lib/api/routeObservability';export const POST = withRouteObservability(async () => {
  try {
    const actor = await getUser();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(actor.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const orgId = await getActorOrganizationId(actor.id);
  
    const candidates = await withTenantScope(orgId, (db) =>
      db.user.findMany({
        where: {
          deletedAt: { not: null },
          NOT: { email: { endsWith: '@deleted.invalid' } },
        },
        select: { id: true, email: true },
        take: 100,
      }),
    );
  
    let freed = 0;
    const ts = Date.now();
    for (const u of candidates) {
      const newEmail = `deleted_${u.id}_${ts}_${u.email}@deleted.invalid`.slice(0, 255);
      try {
        await withTenantScope(orgId, (db) =>
          db.user.updateMany({
            where: { id: u.id },
            data: { email: newEmail },
          }),
        );
        freed += 1;
      } catch (err) {
        captureApiError(err, { route: 'admin/users/free-deleted-emails', extra: { userId: u.id } });
      }
    }
  
    return NextResponse.json({ ok: true, freed, total: candidates.length });
  } catch (error) {
    console.error('/admin/users/free-deleted-emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

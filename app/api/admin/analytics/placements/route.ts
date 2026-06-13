import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { fetchPlacementAnalytics } from './_placementsAnalytics';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);

    return NextResponse.json(await fetchPlacementAnalytics(orgId));
  } catch (error) {
    console.error('/admin/analytics/placements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

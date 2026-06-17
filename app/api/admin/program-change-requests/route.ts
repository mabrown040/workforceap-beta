import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Tenant scope. Without this, tenant admins see cross-tenant member
    // emails + program change reasons.
    let tenantFilter: object = {};
    if (!(await isSuperAdmin(user.id))) {
      try {
        tenantFilter = { user: { organizationId: await getActorOrganizationId(user.id) } };
      } catch {
        return NextResponse.json({ requests: [] });
      }
    }

    const rows = await prisma.$transaction((tx) => tx.programChangeRequest.findMany({
      take: 500,
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true, enrolledProgram: true } },
        reviewedBy: { select: { id: true, email: true, fullName: true } },
      },
    }));

    return NextResponse.json({ requests: rows });
  } catch (error) {
    console.error('[admin/program-change-requests] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const STALE_AFTER_DAYS = 3;

export const GET = withApiGuc(async (_req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);
    const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);

    const staleApps = await prisma.application.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
        user: { organizationId: orgId, deletedAt: null },
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return NextResponse.json({ staleApps });
  } catch (error) {
    console.error('/admin/pipeline/stale error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

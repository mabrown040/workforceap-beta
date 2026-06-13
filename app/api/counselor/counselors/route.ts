import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getActorOrganizationId } from '@/lib/tenant/organization';

/** Active counselors in the actor's org (for inbox-zero bulk reassignment). */
export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const counselor = await isCounselor(user.id);
    const admin = await isAdmin(user.id);
    if (!counselor && !admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);
    const rows = await prisma.$transaction((tx) => tx.counselor.findMany({
      where: {
        active: true,
        user: { organizationId: orgId, deletedAt: null },
      },
      select: {
        id: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { user: { fullName: 'asc' } },
    }));

    return NextResponse.json({
      counselors: rows.map((c) => ({
        counselorId: c.id,
        userId: c.user.id,
        fullName: c.user.fullName,
        email: c.user.email,
      })),
    });
  } catch (err) {
    console.error('[counselor/counselors] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load counselors' }, { status: 500 });
  }
});

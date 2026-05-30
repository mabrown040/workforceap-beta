import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getUserRoles, getProfileRole } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { filterVisibleFlags } from '@/lib/feature-flags/publicApi';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [profileRole, userRoles] = await Promise.all([
      getProfileRole(user.id),
      getUserRoles(user.id),
    ]);

    const allRoles = Array.from(new Set([profileRole, ...userRoles]));

    const flags = await prisma.featureFlag.findMany({
      where: { enabled: true },
      take: 500,
    });

    const visibleFlags = filterVisibleFlags(flags, user.id, allRoles);

    return NextResponse.json({
      flags: visibleFlags.map((f) => ({
        key: f.key,
        name: f.name,
        description: f.description,
      })),
    });
  } catch (error) {
    console.error('[feature-flags GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

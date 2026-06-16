import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { buildInactiveMembersQuery } from './_inactiveMembersQuery';

export const GET = withApiGuc(async (request: Request) => {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(user.id);
  let counselorId: string | null = null;

  if (!admin) {
    const counselor = await prisma.$transaction((tx) => tx.counselor.findFirst({
      where: { userId: user.id, active: true },
      select: { id: true },
    }));

    if (!counselor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    counselorId = counselor.id;
  }

  const { searchParams } = new URL(request.url);
  const daysParam = parseInt(searchParams.get('days') ?? '7', 10);
  const days = [7, 14, 30].includes(daysParam) ? daysParam : 7;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const orgId = await getActorOrganizationId(user.id);

  const inactiveMembers = await prisma.$transaction((tx) =>
    tx.$queryRaw(buildInactiveMembersQuery(orgId, counselorId, cutoffDate))
  );

  // Calculate days inactive for each
  const now = new Date();
  const formatted = (inactiveMembers as any[]).map((m) => {
    const lastActive = m.last_active_at ? new Date(m.last_active_at) : null;
    const daysInactive = lastActive
      ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((now.getTime() - new Date(m.joined_at).getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: m.id,
      email: m.email,
      joinedAt: m.joined_at,
      lastActiveAt: m.last_active_at,
      daysInactive,
      phone: m.profile_phone,
    };
  });

  return NextResponse.json({
    days,
    cutoffDate,
    count: formatted.length,
    members: formatted,
  });

  } catch (error) {
    console.error('/counselor/inactive-members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

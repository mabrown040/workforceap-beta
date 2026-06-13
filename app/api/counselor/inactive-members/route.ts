import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async (request: Request) => {
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

  const assignmentScope = counselorId
    ? Prisma.sql`
      AND EXISTS (
        SELECT 1
        FROM counselor_assignments ca
        WHERE ca.member_id = u.id
          AND ca.active = true
          AND ca.counselor_id = ${counselorId}
      )
    `
    : Prisma.empty;

  const orgId = await getActorOrganizationId(user.id);

  const inactiveMembers = await prisma.$transaction((tx) => tx.$queryRaw`
    SELECT
      u.id,
      u.email,
      u.created_at as joined_at,
      p.role,
      p.profile_phone,
      MAX(me.created_at) as last_active_at
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    LEFT JOIN member_events me ON me.user_id = u.id
    WHERE p.role = 'member'
    AND u.organization_id = ${orgId}
    ${assignmentScope}
    GROUP BY u.id, u.email, u.created_at, p.role, p.profile_phone
    HAVING MAX(me.created_at) IS NULL OR MAX(me.created_at) < ${cutoffDate}
    ORDER BY MAX(me.created_at) ASC NULLS FIRST
  `);

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


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

/**
 * GET /api/counselor/inactive-members?days=7|14|30
 * Returns members (role='member') who haven't had a dashboard_viewed event in N days.
 * Counselor/admin only.
 */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is staff
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });

  const isStaff = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'counselor';
  if (!isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = parseInt(searchParams.get('days') ?? '7', 10);
  const days = [7, 14, 30].includes(daysParam) ? daysParam : 7;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get all members and their last activity
  const inactiveMembers = await prisma.$queryRaw`
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
    GROUP BY u.id, u.email, u.created_at, p.role, p.profile_phone
    HAVING MAX(me.created_at) IS NULL OR MAX(me.created_at) < ${cutoffDate}
    ORDER BY MAX(me.created_at) ASC NULLS FIRST
  `;

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
}

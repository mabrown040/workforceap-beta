import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [signups, activeUsers, enrollments] = await Promise.all([
      prisma.$queryRaw<{ day: string; count: number }[]>`
        SELECT DATE_TRUNC('day', created_at)::date::text as day, COUNT(*)::int as count
        FROM users
        WHERE organization_id = ${orgId}
          AND deleted_at IS NULL
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day
      `,
      prisma.$queryRaw<{ day: string; count: number }[]>`
        SELECT DATE_TRUNC('day', me.created_at)::date::text as day, COUNT(DISTINCT me.user_id)::int as count
        FROM member_events me
        INNER JOIN users u ON u.id = me.user_id AND u.organization_id = ${orgId} AND u.deleted_at IS NULL
        WHERE me.created_at >= ${start} AND me.created_at <= ${end}
        GROUP BY DATE_TRUNC('day', me.created_at)
        ORDER BY day
      `,
      prisma.$queryRaw<{ day: string; count: number }[]>`
        SELECT DATE_TRUNC('day', ce.created_at)::date::text as day, COUNT(*)::int as count
        FROM course_enrollments ce
        INNER JOIN users u ON u.id = ce.user_id AND u.organization_id = ${orgId} AND u.deleted_at IS NULL
        WHERE ce.organization_id = ${orgId}
          AND ce.created_at >= ${start}
          AND ce.created_at <= ${end}
        GROUP BY DATE_TRUNC('day', ce.created_at)
        ORDER BY day
      `,
    ]);

    const dailySignups = signups.map((s) => ({ date: s.day, count: s.count }));
    const dailyEnrollments = enrollments.map((e) => ({ date: e.day, count: e.count }));

    return NextResponse.json({
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      signups: dailySignups,
      activeUsers,
      enrollments: dailyEnrollments,
    });
  } catch (error) {
    console.error('/admin/analytics/members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

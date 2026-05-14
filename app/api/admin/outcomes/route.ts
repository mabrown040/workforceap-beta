import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { unstable_cache } from 'next/cache';

const getOutcomes = unstable_cache(
  async (orgId: string) => {
    return withTenantScope(orgId, async (db) => {
      const totalMembers = await db.user.count({ where: { deletedAt: null, role: 'member' } });
      const enrolled = await db.courseEnrollment.count();
      const completed = await db.courseProgress.count({ where: { status: 'COMPLETED' } });
      const placed = await db.placementRecord.count();

      const avgSalaryAgg = await db.placementRecord.aggregate({ _avg: { salaryOffered: true } });

      const programBreakdown = await db.courseEnrollment.groupBy({
        by: ['programSlug'],
        _count: { programSlug: true },
      });

      const programSlugs = programBreakdown.map((p) => p.programSlug);

      const [completedByProgram, placementUsers, enrollments] = await Promise.all([
        db.courseProgress.groupBy({
          by: ['programSlug'],
          where: { programSlug: { in: programSlugs }, status: 'COMPLETED' },
          _count: { programSlug: true },
        }),
        db.placementRecord.findMany({
          where: {},
          select: { userId: true },
          take: 5000,
        }),
        db.courseEnrollment.findMany({
          where: { programSlug: { in: programSlugs } },
          select: { userId: true, programSlug: true },
          take: 5000,
        }),
      ]);

      const completedMap = new Map(completedByProgram.map((c) => [c.programSlug, c._count.programSlug]));

      const placementUserIds = [...new Set(placementUsers.map((p) => p.userId))];
      const placedMap = new Map<string, number>();
      const seenPairs = new Set<string>();
      for (const e of enrollments) {
        if (!placementUserIds.includes(e.userId)) continue;
        const key = `${e.userId}-${e.programSlug}`;
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        placedMap.set(e.programSlug, (placedMap.get(e.programSlug) ?? 0) + 1);
      }

      const programStats = programBreakdown.map((p) => ({
        program: p.programSlug,
        enrolled: p._count.programSlug,
        completed: completedMap.get(p.programSlug) ?? 0,
        placed: placedMap.get(p.programSlug) ?? 0,
      }));

      const monthlyTrend = await db.user.groupBy({
        by: ['createdAt'],
        where: { deletedAt: null, role: 'member' },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
        take: 12,
      });

      return {
        membersServed: totalMembers,
        completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
        placementRate: completed > 0 ? Math.round((placed / completed) * 100) : 0,
        avgSalaryIncrease: Math.round(avgSalaryAgg._avg.salaryOffered ?? 0),
        programBreakdown: programStats,
        monthlyTrend: monthlyTrend.map((m) => ({
          month: m.createdAt.toISOString().slice(0, 7),
          membersEnrolled: m._count.id,
        })),
      };
    });
  },
  ['admin-outcomes'],
  { revalidate: 300 }
);

export async function GET(req: NextRequest) {
  try {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = await getActorOrganizationId(user.id);
  const data = await getOutcomes(orgId);
  return NextResponse.json(data);

  } catch (error) {
    console.error('/admin/outcomes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


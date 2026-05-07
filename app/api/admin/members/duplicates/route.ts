import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/admin/members/duplicates
 *
 * Returns groups of active (non-deleted) members who share the same
 * lower-case email. Each group sorted by createdAt desc (newest first).
 */
export async function GET(_req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await requireAdmin(user.id); } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Raw query: group by lower(email) having count > 1
  const rows = await prisma.$queryRaw<Array<{ email: string; ids: string[] }>>`
    SELECT lower(email) AS email,
           array_agg(id ORDER BY created_at DESC) AS ids
    FROM users
    WHERE deleted_at IS NULL
    GROUP BY lower(email)
    HAVING count(*) > 1
  `;

  const groups = await Promise.all(
    rows.map(async (row) => {
      const members = await prisma.user.findMany({
        where: { id: { in: row.ids } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          enrolledProgram: true,
          assessmentCompleted: true,
          memberProgramProgress: {
            select: { programSlug: true, coursesCompleted: true, averagePercent: true },
          },
          courseProgress: {
            where: { status: 'COMPLETED' },
            select: { programSlug: true, courseSlug: true },
          },
          profile: {
            select: {
              address: true,
              city: true,
              state: true,
              zip: true,
              profilePhone: true,
              profileLinkedin: true,
            },
          },
          _count: {
            select: {
              applications: true,
              learningProgress: true,
              userCertifications: true,
              memberEvents: true,
              weeklyRecaps: true,
              counselorAssignments: true,
              aiToolResults: true,
              goals: true,
              jobApplications: true,
              messagesAuthored: true,
              partnerReferrals: true,
            },
          },
        },
      });
      return {
        canonicalEmail: row.email,
        members: members.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
      };
    })
  );

  return NextResponse.json({ groups, totalGroups: groups.length, totalDuplicates: groups.reduce((s, g) => s + g.members.length, 0) });
}

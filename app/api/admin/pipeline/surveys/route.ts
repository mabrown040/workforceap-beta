import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * GET /api/admin/pipeline/surveys
 *
 * Returns placement survey response stats and at-risk placements
 * (no response after 7 days past survey send).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (!(await isAdmin(user.id)) && !(await isCounselor(user.id)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [totalSent, totalCompleted, atRiskRows] = await Promise.all([
      prisma.placementSurvey.count(),
      prisma.placementSurvey.count({ where: { completedAt: { not: null } } }),
      prisma.placementSurvey.findMany({
        where: {
          wave: 'thirty_day',
          completedAt: null,
          sentAt: { not: null },
          // Sent more than 7 days ago
          AND: [
            { sentAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
        include: {
          user: { select: { fullName: true, email: true } },
          placement: { select: { employerName: true, jobTitle: true, placedAt: true } },
        },
        orderBy: { sentAt: 'asc' },
        take: 100,
      }),
    ]);

    const atRisk = atRiskRows.map((s) => ({
      id: s.placementId,
      userId: s.userId,
      fullName: s.user?.fullName ?? null,
      email: s.user?.email ?? null,
      employerName: s.placement?.employerName ?? '—',
      jobTitle: s.placement?.jobTitle ?? '—',
      placedAt: s.placement?.placedAt?.toISOString() ?? '',
      daysSincePlacement: s.placement?.placedAt ? daysSince(s.placement.placedAt) : 0,
      surveySent: true,
      surveyCompleted: false,
      wave: s.wave,
    }));

    const responseRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;

    return NextResponse.json({
      stats: {
        totalSent,
        totalCompleted,
        responseRate,
        atRiskCount: atRisk.length,
      },
      atRisk,
    });
  } catch (error) {
    console.error('/admin/pipeline/surveys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

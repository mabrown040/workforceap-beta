import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { THRESHOLDS } from '@/lib/member/atRiskScoring';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async (_req: NextRequest) => {
  try {
    const user = await getUser();
    const [admin, counselor] = user
      ? await Promise.all([isAdmin(user.id), isCounselor(user.id)])
      : [false, false];

    if (!user || (!admin && !counselor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const counselorScope = admin
      ? {}
      : {
          user: {
            counselorAssignments: {
              some: {
                active: true,
                counselor: { active: true, userId: user.id },
              },
            },
          },
        };

    const [criticalCount, alertsSentToday, pendingAlerts] = await Promise.all([
      prisma.atRiskAlert.count({
        where: {
          ...counselorScope,
          score: { gte: THRESHOLDS.CRITICAL },
          status: { in: ['open', 'acknowledged'] },
        },
      }),
      prisma.atRiskAlert.count({
        where: {
          ...counselorScope,
          notifiedCounselorAt: { gte: todayStart },
        },
      }),
      prisma.atRiskAlert.findMany({
        where: {
          ...counselorScope,
          score: { gte: THRESHOLDS.CRITICAL },
          status: { in: ['open', 'acknowledged'] },
        },
        select: {
          user: {
            select: {
              counselorAssignments: {
                where: admin
                  ? { active: true }
                  : { active: true, counselor: { active: true, userId: user.id } },
                select: {
                  counselor: {
                    select: {
                      user: { select: { fullName: true, email: true } },
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    // Roll up pending alerts by counselor
    const counselorMap = new Map<
      string,
      { name: string; email: string; memberCount: number }
    >();

    for (const alert of pendingAlerts) {
      const c = alert.user.counselorAssignments[0]?.counselor?.user;
      if (!c?.email) continue;
      const existing = counselorMap.get(c.email);
      if (existing) {
        existing.memberCount++;
      } else {
        counselorMap.set(c.email, {
          name: c.fullName ?? 'Unknown',
          email: c.email,
          memberCount: 1,
        });
      }
    }

    return NextResponse.json({
      criticalCount,
      alertsSentToday,
      counselorsWithPending: Array.from(counselorMap.values()).sort(
        (a, b) => b.memberCount - a.memberCount
      ),
    });
  } catch (error) {
    console.error('/admin/pipeline/at-risk-stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

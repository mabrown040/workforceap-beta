import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getRiskLevel } from '@/lib/member/atRiskScoring';
import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [admin, counselorRole] = await Promise.all([
      isAdmin(user.id),
      isCounselor(user.id),
    ]);
    if (!admin && !counselorRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const counselor = await prisma.$transaction((tx) => tx.counselor.findFirst({
      where: { userId: user.id, active: true },
      select: { id: true },
    }));

    if (!counselor && !admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignments = counselor
      ? await prisma.$transaction((tx) => tx.counselorAssignment.findMany({
          take: 500,
          where: {
            counselor: { userId: user.id, active: true },
            active: true,
          },
          include: {
            member: {
              select: {
                id: true,
                enrolledProgram: true,
                createdAt: true,
                memberProgramProgress: {
                  select: { programSlug: true, averagePercent: true, coursesCompleted: true },
                },
              },
            },
          },
        }))
      : [];

    const memberIds = assignments.map((a) => a.memberId);

    // Risk scores
    const [alerts, recentEvents, programAverages] = await Promise.all([
      memberIds.length > 0
        ? prisma.$transaction((tx) => tx.atRiskAlert.findMany({
            take: 500,
            where: {
              userId: { in: memberIds },
              status: { in: ['open', 'acknowledged'] },
            },
            select: { userId: true, score: true },
          }))
        : Promise.resolve([]),
      memberIds.length > 0
        ? prisma.$transaction((tx) => tx.memberEvent.findMany({
            take: 100,
            where: {
              userId: { in: memberIds },
              eventName: { in: ['course_completed', 'certification_earned', 'placement_recorded'] },
            },
            orderBy: { createdAt: 'desc' },
            select: {
              userId: true,
              eventName: true,
              createdAt: true,
              metadata: true,
            },
          }))
        : Promise.resolve([]),
      // Compute program-wide averages for comparison
      memberIds.length > 0
        ? prisma.$transaction((tx) => tx.memberProgramProgress.groupBy({
            by: ['programSlug'],
            where: { userId: { in: memberIds } },
            _avg: { averagePercent: true },
            _count: { userId: true },
          }))
        : Promise.resolve([]),
    ]);

    const scoreByUser = new Map<string, number>();
    for (const a of alerts) {
      if (!scoreByUser.has(a.userId)) scoreByUser.set(a.userId, a.score);
    }

    const totalMembers = assignments.length;
    const activeMembers = assignments.filter(
      (a) => a.member.enrolledProgram != null,
    ).length;
    const atRiskMembers = Array.from(scoreByUser.values()).filter(
      (s) => getRiskLevel(s) !== 'LOW',
    ).length;

    // Average progress across all assigned members
    let totalProgress = 0;
    let progressCount = 0;
    for (const a of assignments) {
      for (const p of a.member.memberProgramProgress) {
        totalProgress += p.averagePercent;
        progressCount++;
      }
    }
    const avgProgress = progressCount > 0 ? Math.round(totalProgress / progressCount) : 0;

    // Progress distribution buckets
    const distribution = [0, 0, 0, 0]; // 0-25%, 25-50%, 50-75%, 75-100%
    for (const a of assignments) {
      for (const p of a.member.memberProgramProgress) {
        const pct = p.averagePercent;
        if (pct <= 25) distribution[0]++;
        else if (pct <= 50) distribution[1]++;
        else if (pct <= 75) distribution[2]++;
        else distribution[3]++;
      }
    }

    // By program
    const byProgramMap = new Map<string, { program: string; members: number; avgProgress: number; totalProgress: number }>();
    for (const a of assignments) {
      const slug = a.member.enrolledProgram;
      if (!slug) continue;
      const existing = byProgramMap.get(slug);
      const memberAvg = a.member.memberProgramProgress.find((p) => p.programSlug === slug)?.averagePercent ?? 0;
      if (existing) {
        existing.members++;
        existing.totalProgress += memberAvg;
        existing.avgProgress = Math.round(existing.totalProgress / existing.members);
      } else {
        byProgramMap.set(slug, { program: slug, members: 1, avgProgress: memberAvg, totalProgress: memberAvg });
      }
    }

    // By status
    const byStatus = [
      { status: 'active', count: activeMembers },
      { status: 'not_enrolled', count: totalMembers - activeMembers },
    ];

    // Recent completions / placements (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCompletions = recentEvents.filter(
      (e) => (e.eventName === 'course_completed' || e.eventName === 'certification_earned') && e.createdAt >= thirtyDaysAgo,
    ).length;
    const recentPlacements = recentEvents.filter(
      (e) => e.eventName === 'placement_recorded' && e.createdAt >= thirtyDaysAgo,
    ).length;

    // Recent activity feed
    const activityFeed = recentEvents.slice(0, 10).map((e) => ({
      memberId: e.userId,
      type: e.eventName as 'course_completed' | 'certification_earned' | 'placement_recorded',
      date: e.createdAt.toISOString(),
      metadata: e.metadata as Record<string, unknown> | null,
    }));

    // At-risk list with details
    const atRiskList = assignments
      .filter((a) => {
        const score = scoreByUser.get(a.memberId);
        return score != null && getRiskLevel(score) !== 'LOW';
      })
      .map((a) => ({
        memberId: a.memberId,
        riskScore: scoreByUser.get(a.memberId) ?? 0,
        riskLevel: getRiskLevel(scoreByUser.get(a.memberId) ?? 0),
        enrolledProgram: a.member.enrolledProgram,
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return NextResponse.json({
      totalMembers,
      activeMembers,
      atRiskMembers,
      avgProgress,
      recentCompletions,
      recentPlacements,
      progressDistribution: [
        { range: '0–25%', count: distribution[0] },
        { range: '25–50%', count: distribution[1] },
        { range: '50–75%', count: distribution[2] },
        { range: '75–100%', count: distribution[3] },
      ],
      byProgram: Array.from(byProgramMap.values()).map((p) => ({
        program: p.program,
        members: p.members,
        avgProgress: p.avgProgress,
      })),
      byStatus,
      recentActivity: activityFeed,
      atRiskList,
      programAverages: programAverages.map((p) => ({
        program: p.programSlug,
        avgProgress: Math.round(p._avg.averagePercent ?? 0),
        members: p._count.userId,
      })),
    });
  } catch (error) {
    console.error('/api/counselor/analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
});

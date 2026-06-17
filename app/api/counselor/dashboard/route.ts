import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getCounselorCommandCenter } from '@/lib/counselor/commandCenter';

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
      select: { id: true, partner: { select: { name: true } } },
    }));

    if (!counselor && !admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 1. Assignments with member data (single query, eager-loaded) ──
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
                fullName: true,
                email: true,
                programInterest: true,
                enrolledProgram: true,
                assessmentScorePct: true,
                memberProgramProgress: {
                  select: {
                    programSlug: true,
                    averagePercent: true,
                    coursesCompleted: true,
                  },
                },
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        }))
      : [];

    const memberIds = assignments.map((a) => a.memberId);

    // ── 2. Messages needing reply — single raw query (no N+1) ──
    let messagesNeedingReply = 0;
    if (memberIds.length > 0) {
      const rows = await prisma.$transaction((tx) => tx.$queryRawUnsafe<
        Array<{ count: bigint }>
      >(
        `SELECT COUNT(DISTINCT t.member_id) as count
         FROM message_threads t
         JOIN LATERAL (
           SELECT author_id, created_at
           FROM messages m
           WHERE m.thread_id = t.id
           ORDER BY m.created_at DESC
           LIMIT 1
         ) latest ON true
         WHERE t.kind = 'member'
           AND t.member_id = ANY($1::uuid[])
           AND latest.author_id = t.member_id`,
        memberIds,
      ));
      messagesNeedingReply = Number(rows[0]?.count ?? 0);
    }

    // ── 3. Command center (batched internally) ──
    const isAdminUser = admin;
    let commandCenter;
    try {
      commandCenter = await getCounselorCommandCenter(user.id, {
        isAdmin: isAdminUser && !counselor,
        perSectionLimit: 5,
      });
    } catch {
      commandCenter = {
        needsReply: [],
        atRisk: [],
        interviewing: [],
        totals: {
          needsReplyCount: 0,
          atRiskCount: 0,
          interviewingCount: 0,
          slaBreachCount: 0,
        },
      };
    }

    const enrolledCount = assignments.filter(
      (a) => a.member.enrolledProgram,
    ).length;
    const needsAttentionCount = assignments.filter(
      (a) => !a.member.enrolledProgram && !a.member.programInterest,
    ).length;

    return NextResponse.json({
      assignments: assignments.map((a) => ({
        assignmentId: a.id,
        memberId: a.member.id,
        memberName: a.member.fullName,
        memberEmail: a.member.email,
        programInterest: a.member.programInterest,
        enrolledProgram: a.member.enrolledProgram,
        assessmentScorePct: a.member.assessmentScorePct,
        memberProgramProgress: a.member.memberProgramProgress,
      })),
      stats: {
        totalMembers: assignments.length,
        enrolledCount,
        needsAttentionCount,
        messagesNeedingReply,
      },
      commandCenter,
    });
  } catch (error) {
    console.error('/api/counselor/dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
});

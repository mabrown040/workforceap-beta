import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { getOrCreateMemberCounselorThread } from '@/lib/messages/counselorThread';
import { getMemberPoints } from '@/lib/member/points';
import { loadMemberSkillsetProgress } from '@/lib/coursera/memberSkillsetProgress';
import { loadMemberProgramTrainingView } from '@/lib/member/memberProgramTrainingView';
import { resolveTrainingProgressAssignment } from '@/lib/member/trainingProgress';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { fetchLearnerProgressFromB4B } from '@/lib/coursera/learnerProgress';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async (
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) => {
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

    const { memberId } = await params;

    if (!(await assertStaffCanAccessMemberRecord(user.id, memberId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 1. Member + profile + enrollments (single query, eager-loaded) ──
    const member = await prisma.$transaction((tx) => tx.user.findFirst({
      where: { id: memberId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        programInterest: true,
        assessmentScorePct: true,
        wioaQualificationJson: true,
        wioaReviewStatus: true,
        wioaReviewedAt: true,
        wioaReviewedByUserId: true,
        wioaReviewNotes: true,
        createdAt: true,
        courseEnrollments: {
          select: {
            programSlug: true,
            curriculumVersion: true,
            isPrimary: true,
            enrolledAt: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
        },
        profile: {
          select: {
            resumeOriginalPath: true,
            resumeEnhancedPath: true,
            hasEmploymentBarrier: true,
            barrierTypes: true,
            profileBio: true,
          },
        },
      },
    }));

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 },
      );
    }

    // ── 2. Applications + AI matches + points + events (parallel, batched) ──
    const [
      applications,
      aiMatches,
      memberPts,
      recentTx,
      pitchDeployments,
      skillsetProgress,
    ] = await Promise.all([
      prisma.$transaction((tx) => tx.jobPostingApplication.findMany({
        take: 500,
        where: { studentId: memberId },
        orderBy: { appliedAt: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              employer: { select: { companyName: true } },
            },
          },
        },
      })),
      prisma.$transaction((tx) => tx.aIJobMatch.findMany({
        take: 500,
        where: { studentId: memberId },
        orderBy: { matchScore: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              employer: { select: { companyName: true } },
            },
          },
        },
      })),
      getMemberPoints(memberId).catch(() => null),
      prisma.$transaction((tx) => tx.pointsTransaction
        .findMany({
          where: { userId: memberId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            event: true,
            points: true,
            note: true,
            createdAt: true,
          },
        }))
        .catch(() => []),
      prisma.$transaction((tx) => tx.memberEvent
        .findMany({
          where: { userId: memberId, eventName: 'pitch_deployed' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, metadata: true, createdAt: true },
        }))
        .catch(() => []),
      loadMemberSkillsetProgress(member.id),
    ]);

    // ── 3. Thread + messages with eager-loaded authors (single query) ──
    const thread = await getOrCreateMemberCounselorThread(memberId);
    const messages = await prisma.$transaction((tx) => tx.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 500,
      include: {
        author: {
          select: { id: true, fullName: true },
        },
      },
    }));

    // ── 4. Training progress (conditional, single call) ──
    const trainingAssignment = resolveTrainingProgressAssignment(
      member.enrolledProgram,
      member.courseEnrollments,
    );
    const activeProgramSlug = trainingAssignment.programSlug;
    let trainingView = null;
    if (activeProgramSlug) {
      const courseraProgramId =
        DISCOVERED_COURSERA_PROGRAMS[activeProgramSlug]?.courseraProgramId;
      const b4bProgress =
        member.email?.trim()
          ? await fetchLearnerProgressFromB4B(member.email, {
              programId: courseraProgramId,
            }).catch(() => new Map())
          : new Map();

      trainingView = await loadMemberProgramTrainingView({
        userId: member.id,
        programSlug: activeProgramSlug,
        b4bProgress,
      });
    }

    // ── 5. WIOA reviewer name (single lookup only when needed) ──
    let wioaReviewerName: string | null = null;
    if (member.wioaReviewedByUserId) {
      const wioaReviewedByUserId = member.wioaReviewedByUserId;
      const rev = await prisma.$transaction((tx) => tx.user.findUnique({
        where: { id: wioaReviewedByUserId },
        select: { fullName: true },
      }));
      wioaReviewerName = rev?.fullName ?? null;
    }

    const wioaSnap = parseWioaQualificationSnapshot(
      member.wioaQualificationJson,
    );

    return NextResponse.json({
      member: {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        enrolledProgram: activeProgramSlug,
        programInterest: member.programInterest,
        assessmentScorePct: member.assessmentScorePct,
        wioaQualificationJson: member.wioaQualificationJson,
        wioaReviewStatus: member.wioaReviewStatus,
        wioaReviewedAt: member.wioaReviewedAt?.toISOString() ?? null,
        wioaReviewedByUserId: member.wioaReviewedByUserId,
        wioaReviewNotes: member.wioaReviewNotes,
        createdAt: member.createdAt.toISOString(),
        profile: member.profile,
        courseEnrollments: member.courseEnrollments,
      },
      applications,
      aiMatches,
      points: memberPts,
      recentTransactions: recentTx,
      pitchDeployments,
      thread: {
        id: thread.id,
        memberId: thread.memberId,
        counselorUserId: thread.counselorUserId,
        memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
        counselorLastReadAt:
          thread.counselorLastReadAt?.toISOString() ?? null,
      },
      messages: messages.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        authorId: m.authorId ?? '',
        authorName: m.author?.fullName ?? 'User',
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
      trainingView,
      skillsetProgress,
      wioa: wioaSnap
        ? {
            snapshot: wioaSnap,
            reviewStatus: member.wioaReviewStatus,
            reviewedAt: member.wioaReviewedAt?.toISOString() ?? null,
            reviewerName: wioaReviewerName,
            reviewNotes: member.wioaReviewNotes,
          }
        : null,
    });
  } catch (error) {
    console.error('/api/counselor/members/[memberId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
});

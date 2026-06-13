import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { sendAssessmentResetNotificationEmail } from '@/lib/email';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: user.id },
      select: {
        fullName: true,
        email: true,
        assessmentCompleted: true,
        assessmentScore: true,
        assessmentScorePct: true,
        assessmentCompletedAt: true,
        assessmentAnswers: true,
        programInterest: true,
      },
    }));
  
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!dbUser.assessmentCompleted) {
      return NextResponse.json({ error: 'Assessment not completed yet — nothing to reset' }, { status: 400 });
    }
  
    // Archive previous score in WorkflowDiagnostic for full history
    await prisma.$transaction((tx) => tx.workflowDiagnostic.create({
      data: {
        workflow: 'member_assessment_history',
        status: 'inspection',
        actorUserId: user.id,
        method: 'member_reset_request',
        summary: `Assessment reset by member. Previous score: ${dbUser.assessmentScorePct ?? 0}% (${dbUser.assessmentScore ?? 0} pts). Program: ${dbUser.programInterest ?? 'n/a'}`,
        metadata: {
          userId: user.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          previousScore: dbUser.assessmentScore,
          previousScorePct: dbUser.assessmentScorePct,
          previousAnswers: dbUser.assessmentAnswers,
          completedAt: dbUser.assessmentCompletedAt?.toISOString(),
          resetAt: new Date().toISOString(),
        },
      },
    }));
  
    // Reset assessment flags so they can retake
    await prisma.$transaction((tx) => tx.user.update({
      where: { id: user.id },
      data: {
        assessmentCompleted: false,
        assessmentScore: null,
        assessmentScorePct: null,
        assessmentCompletedAt: null,
        assessmentAnswers: undefined,
      },
    }));
  
    // Notify staff
    try {
      await sendAssessmentResetNotificationEmail({
        memberName: dbUser.fullName ?? dbUser.email,
        memberEmail: dbUser.email,
        previousScore: dbUser.assessmentScorePct ?? 0,
        programInterest: dbUser.programInterest ?? 'Not specified',
      });
    } catch (e) {
      console.error('[assessment/reset] notification email failed', e);
    }
  
    return NextResponse.json({ ok: true, message: 'Assessment reset. You can now retake from the dashboard.' });
  } catch (error) {
    console.error('/member/assessment/reset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

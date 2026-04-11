import { prisma } from '../db/prisma';
import { generateResumeBullet } from '../ai/proactiveResumeGenerator';
import { findBestEmployerMatch } from '../ai/proactiveJobMatcher';
import { recordWorkflowDiagnostic } from '../diagnostics';

type LearningCompletionResult = {
  actionId: string;
  created: boolean;
  duplicatedRecentAction: boolean;
  matchedJobId: string | null;
  resumeBullet: string;
};

const DUPLICATE_LOOKBACK_MS = 1000 * 60 * 60 * 24 * 7;

function normalizeCourseName(courseName: string) {
  return courseName.trim().replace(/\s+/g, ' ');
}

export async function handleLearningCompletion(memberId: string, courseName: string): Promise<LearningCompletionResult> {
  const normalizedCourseName = normalizeCourseName(courseName);
  const startedAt = Date.now();

  await recordWorkflowDiagnostic({
    workflow: 'career_os_learning_completion',
    status: 'started',
    entityType: 'user',
    entityId: memberId,
    summary: `Processing learning completion for ${normalizedCourseName}`,
    method: 'webhook',
    metadata: { courseName: normalizedCourseName },
  });

  try {
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, fullName: true },
    });

    if (!member) {
      await recordWorkflowDiagnostic({
        workflow: 'career_os_learning_completion',
        status: 'error',
        entityType: 'user',
        entityId: memberId,
        summary: 'Learning completion received for missing member',
        method: 'webhook',
        failureReason: 'member_not_found',
        metadata: { courseName: normalizedCourseName },
      });
      throw new Error(`Member not found: ${memberId}`);
    }

    const duplicateCutoff = new Date(Date.now() - DUPLICATE_LOOKBACK_MS);
    const existingRecentAction = await prisma.memberNextBestAction.findFirst({
      where: {
        memberId,
        status: 'PENDING',
        description: { contains: normalizedCourseName },
        createdAt: { gte: duplicateCutoff },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, ctaHref: true },
    });

    const bullet = await generateResumeBullet(normalizedCourseName);
    const jobMatch = await findBestEmployerMatch(memberId, normalizedCourseName);

    let title = 'Update your Resume';
    let desc = `You finished ${normalizedCourseName}. We drafted a new resume bullet for you.`;
    let ctaLabel = 'Review Resume';
    let ctaHref = '/dashboard/resume';

    if (jobMatch) {
      title = `New Skill Match: ${jobMatch.title}`;
      desc = `You finished ${normalizedCourseName}. We matched that skill to ${jobMatch.title}. Practice a 3-minute mock interview now.`;
      ctaLabel = 'Practice Interview';
      ctaHref = `/dashboard/ai-tools/interview-practice?jobId=${jobMatch.id}`;
    }

    if (existingRecentAction) {
      await prisma.memberEvent.create({
        data: {
          userId: memberId,
          eventName: 'career_os.learning_completion_duplicate',
          entityType: 'MemberNextBestAction',
          entityId: existingRecentAction.id,
          sourcePage: '/api/webhooks/learning-completion',
          metadata: {
            courseName: normalizedCourseName,
            resumeBullet: bullet,
            matchedJobId: jobMatch?.id ?? null,
          },
        },
      });

      await recordWorkflowDiagnostic({
        workflow: 'career_os_learning_completion',
        status: 'inspection',
        entityType: 'MemberNextBestAction',
        entityId: existingRecentAction.id,
        summary: 'Skipped duplicate next-best action for recent learning completion',
        method: 'dedupe_recent_pending_action',
        metadata: {
          memberId,
          courseName: normalizedCourseName,
          matchedJobId: jobMatch?.id ?? null,
        },
      });

      return {
        actionId: existingRecentAction.id,
        created: false,
        duplicatedRecentAction: true,
        matchedJobId: jobMatch?.id ?? null,
        resumeBullet: bullet,
      };
    }

    const action = await prisma.$transaction(async (tx) => {
      await tx.memberNextBestAction.updateMany({
        where: {
          memberId,
          status: 'PENDING',
          icon: 'auto_awesome',
        },
        data: {
          status: 'DISMISSED',
        },
      });

      const createdAction = await tx.memberNextBestAction.create({
        data: {
          memberId,
          title,
          description: desc,
          ctaLabel,
          ctaHref,
          icon: 'auto_awesome',
          priority: 100,
        },
      });

      await tx.memberEvent.create({
        data: {
          userId: memberId,
          eventName: 'career_os.learning_completion_processed',
          entityType: 'MemberNextBestAction',
          entityId: createdAction.id,
          sourcePage: '/api/webhooks/learning-completion',
          metadata: {
            courseName: normalizedCourseName,
            resumeBullet: bullet,
            matchedJobId: jobMatch?.id ?? null,
            ctaHref,
          },
        },
      });

      return createdAction;
    });

    await recordWorkflowDiagnostic({
      workflow: 'career_os_learning_completion',
      status: 'success',
      entityType: 'MemberNextBestAction',
      entityId: action.id,
      summary: jobMatch
        ? `Created matched interview action for ${member.fullName ?? member.id}`
        : `Created resume follow-up action for ${member.fullName ?? member.id}`,
      provider: jobMatch ? 'job_matcher' : 'resume_only',
      method: 'webhook',
      metadata: {
        memberId,
        courseName: normalizedCourseName,
        matchedJobId: jobMatch?.id ?? null,
        durationMs: Date.now() - startedAt,
      },
    });

    return {
      actionId: action.id,
      created: true,
      duplicatedRecentAction: false,
      matchedJobId: jobMatch?.id ?? null,
      resumeBullet: bullet,
    };
  } catch (error) {
    await recordWorkflowDiagnostic({
      workflow: 'career_os_learning_completion',
      status: 'error',
      entityType: 'user',
      entityId: memberId,
      summary: 'Learning completion workflow failed',
      method: 'webhook',
      failureReason: error instanceof Error ? error.message : 'unknown_error',
      metadata: { courseName: normalizedCourseName },
    });
    throw error;
  }
}

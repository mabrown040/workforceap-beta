import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { findPathwayById } from '@/lib/content/learningPathways';
import { awardPoints } from '@/lib/member/points';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
export const POST = withApiGuc(async (
  _request: Request,
  { params }: { params: Promise<{ pathwayId: string; stepIndex: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const { pathwayId, stepIndex } = await params;
    const stepIdx = parseInt(stepIndex, 10);
    if (isNaN(stepIdx) || stepIdx < 0) {
      return NextResponse.json({ error: 'Invalid step index' }, { status: 400 });
    }
  
    const pathway = findPathwayById(pathwayId);
    if (!pathway || stepIdx >= pathway.steps.length) {
      return NextResponse.json({ error: 'Pathway or step not found' }, { status: 404 });
    }
  
    const stepTitle = pathway.steps[stepIdx];
  
    try {
      await ensureUserInDb(user);
      const progress = await prisma.$transaction((tx) => tx.pathwayStepProgress.upsert({
        where: {
          userId_pathwayId_stepIndex: { userId: user.id, pathwayId, stepIndex: stepIdx },
        },
        create: {
          userId: user.id,
          pathwayId,
          stepIndex: stepIdx,
          stepTitle,
          status: 'completed',
          completedAt: new Date(),
        },
        update: {
          status: 'completed',
          completedAt: new Date(),
        },
      }));
  
      await prisma.$transaction((tx) => tx.learningProgress.upsert({
        where: { userId_pathwayId: { userId: user.id, pathwayId } },
        create: {
          userId: user.id,
          pathwayId,
          progress: Math.round(((stepIdx + 1) / pathway.steps.length) * 100),
          completed: stepIdx === pathway.steps.length - 1,
        },
        update: {
          progress: Math.round(((stepIdx + 1) / pathway.steps.length) * 100),
          completed: stepIdx === pathway.steps.length - 1,
        },
      }));
  
      await trackEvent({
        userId: user.id,
        eventName: 'pathway_step_completed',
        entityType: 'pathway_step',
        entityId: `${pathwayId}-${stepIdx}`,
        metadata: { pathwayId, stepIndex: stepIdx, stepTitle },
      });

      // Funnel boundary events: first completed step starts the pathway,
      // the final step (same condition as learningProgress.completed) ends it.
      const completedSteps = await prisma.$transaction((tx) => tx.pathwayStepProgress.count({
        where: { userId: user.id, pathwayId, status: 'completed' },
      }));
      if (completedSteps === 1) {
        await trackEvent({
          userId: user.id,
          eventName: 'pathway_started',
          entityType: 'pathway',
          entityId: pathwayId,
          metadata: { pathwayId, firstStepIndex: stepIdx },
        });
      }
      if (stepIdx === pathway.steps.length - 1) {
        await trackEvent({
          userId: user.id,
          eventName: 'pathway_completed',
          entityType: 'pathway',
          entityId: pathwayId,
          metadata: { pathwayId, totalSteps: pathway.steps.length, completedSteps },
        });
      }
  
      // Award points (idempotent per (pathway, step))
      awardPoints(user.id, 'pathway_step_completed', `${pathwayId}-${stepIdx}`).catch(() => {});
  
      auditLog({ actorUserId: user.id, action: 'member.pathwayStep.complete', targetType: 'PathwayProgress', targetId: pathwayId }).catch(() => {});
      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'PathwayProgress', id: pathwayId }, result: { success: true } }).catch(() => {});
      return NextResponse.json({ progress });
    } catch (err) {
      console.error('[POST pathway step complete]', err);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }
  } catch (error) {
    console.error('/member/pathway-steps/[pathwayId]/[stepIndex]/complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

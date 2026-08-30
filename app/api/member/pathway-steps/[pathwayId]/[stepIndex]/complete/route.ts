import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { findPathwayById, getPathwayForProgram } from '@/lib/content/learningPathways';
import { getProgramBySlug } from '@/lib/content/programs';
import { programSlugsEquivalent } from '@/lib/content/programSlug';
import {
  CATALOG_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
  type CurriculumVersion,
} from '@/lib/content/programCurriculumManifest';
import { normalizeCurriculumVersion } from '@/lib/member/curriculumAssignment';
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
  
    const program = getProgramBySlug(pathwayId);
    let curriculumVersion: CurriculumVersion = CATALOG_CURRICULUM_VERSION;
    let pathway = program ? null : findPathwayById(pathwayId);

    if (program) {
      const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
        where: { id: user.id },
        select: {
          enrolledProgram: true,
          courseEnrollments: {
            select: { programSlug: true, curriculumVersion: true },
          },
        },
      }));
      const assignment = dbUser?.courseEnrollments.find((enrollment) =>
        programSlugsEquivalent(enrollment.programSlug, program.slug),
      ) ?? null;

      if (!assignment) {
        const mayUseLegacyFallback =
          (dbUser?.courseEnrollments.length ?? 0) === 0
          && !!dbUser?.enrolledProgram
          && programSlugsEquivalent(dbUser.enrolledProgram, program.slug);
        if (!mayUseLegacyFallback) {
          return NextResponse.json(
            { error: 'Pathway is not assigned to this member' },
            { status: 403 },
          );
        }
        curriculumVersion = LEGACY_CURRICULUM_VERSION;
      } else {
        try {
          curriculumVersion = normalizeCurriculumVersion(assignment.curriculumVersion);
        } catch {
          return NextResponse.json({ error: 'Pathway assignment is invalid' }, { status: 409 });
        }
      }

      try {
        pathway = getPathwayForProgram(program.slug, curriculumVersion);
      } catch {
        pathway = null;
      }
    }

    if (!pathway || stepIdx >= pathway.steps.length) {
      return NextResponse.json({ error: 'Pathway or step not found' }, { status: 404 });
    }
    const resolvedPathwayId = pathway.id;
    const stepTitle = pathway.steps[stepIdx];
  
    try {
      await ensureUserInDb(user);
      const progress = await prisma.$transaction((tx) => tx.pathwayStepProgress.upsert({
        where: {
          userId_pathwayId_stepIndex: {
            userId: user.id,
            pathwayId: resolvedPathwayId,
            stepIndex: stepIdx,
          },
        },
        create: {
          userId: user.id,
          pathwayId: resolvedPathwayId,
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
        where: { userId_pathwayId: { userId: user.id, pathwayId: resolvedPathwayId } },
        create: {
          userId: user.id,
          pathwayId: resolvedPathwayId,
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
        entityId: `${resolvedPathwayId}-${stepIdx}`,
        metadata: {
          pathwayId: resolvedPathwayId,
          curriculumVersion,
          stepIndex: stepIdx,
          stepTitle,
          totalSteps: pathway.steps.length,
        },
      });

      // Funnel boundary events: first completed step starts the pathway,
      // the final step (same condition as learningProgress.completed) ends it.
      const completedSteps = await prisma.$transaction((tx) => tx.pathwayStepProgress.count({
        where: { userId: user.id, pathwayId: resolvedPathwayId, status: 'completed' },
      }));
      if (completedSteps === 1) {
        await trackEvent({
          userId: user.id,
          eventName: 'pathway_started',
          entityType: 'pathway',
          entityId: resolvedPathwayId,
          metadata: {
            pathwayId: resolvedPathwayId,
            curriculumVersion,
            firstStepIndex: stepIdx,
            totalSteps: pathway.steps.length,
          },
        });
      }
      if (stepIdx === pathway.steps.length - 1) {
        await trackEvent({
          userId: user.id,
          eventName: 'pathway_completed',
          entityType: 'pathway',
          entityId: resolvedPathwayId,
          metadata: {
            pathwayId: resolvedPathwayId,
            curriculumVersion,
            totalSteps: pathway.steps.length,
            completedSteps,
          },
        });
      }
  
      // Award points (idempotent per (pathway, step))
      awardPoints(user.id, 'pathway_step_completed', `${resolvedPathwayId}-${stepIdx}`).catch(() => {});
  
      auditLog({ actorUserId: user.id, action: 'member.pathwayStep.complete', targetType: 'PathwayProgress', targetId: resolvedPathwayId, metadata: { curriculumVersion } }).catch(() => {});
      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'PathwayProgress', id: resolvedPathwayId }, result: { success: true, extensions: { curriculumVersion } } }).catch(() => {});
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

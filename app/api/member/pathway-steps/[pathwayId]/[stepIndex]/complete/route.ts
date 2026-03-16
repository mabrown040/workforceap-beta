import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { PATHWAYS } from '@/lib/content/learningPathways';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ pathwayId: string; stepIndex: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { pathwayId, stepIndex } = await params;
  const stepIdx = parseInt(stepIndex, 10);
  if (isNaN(stepIdx) || stepIdx < 0) {
    return NextResponse.json({ error: 'Invalid step index' }, { status: 400 });
  }

  const pathway = PATHWAYS.find((p) => p.id === pathwayId);
  if (!pathway || stepIdx >= pathway.steps.length) {
    return NextResponse.json({ error: 'Pathway or step not found' }, { status: 404 });
  }

  const stepTitle = pathway.steps[stepIdx];

  try {
    await ensureUserInDb(user);
    const progress = await prisma.pathwayStepProgress.upsert({
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
    });

    await prisma.learningProgress.upsert({
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
    });

    await trackEvent({
      userId: user.id,
      eventName: 'pathway_step_completed',
      entityType: 'pathway_step',
      entityId: `${pathwayId}-${stepIdx}`,
      metadata: { pathwayId, stepIndex: stepIdx, stepTitle },
    });

    return NextResponse.json({ progress });
  } catch (err) {
    console.error('[POST pathway step complete]', err);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

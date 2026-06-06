import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { captureApiError } from '@/lib/observability/captureApiError';
import type { CareerMatchResult } from '@/lib/onet/types';
import {
  parseGoalDescription,
  encodeGoalDescription,
  generateGoalSteps,
  buildSteps,
} from '@/lib/member/goalSteps';

async function loadOwnedGoal(goalId: string, userId: string) {
  return prisma.goal.findFirst({ where: { id: goalId, userId } });
}

/**
 * GET — return the structured steps for a goal.
 */
async function _GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const goal = await loadOwnedGoal(id, user.id);
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { steps, note } = parseGoalDescription(goal.description);
    return NextResponse.json({ steps, note });
  } catch (error) {
    captureApiError(error, { route: 'member/goals/[id]/steps GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);

/**
 * POST — generate AI step plan for a goal (replaces existing steps).
 */
async function _POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const goal = await loadOwnedGoal(id, user.id);
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = parseGoalDescription(goal.description);

    // Pull the member's target career to personalize the steps.
    let careerTitle: string | null = null;
    try {
      const profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: { careerRecommendationJson: true },
      });
      const rec = (profile?.careerRecommendationJson ?? null) as CareerMatchResult | null;
      careerTitle = rec?.topOccupations?.[0]?.title ?? null;
    } catch {
      careerTitle = null;
    }

    const stepTexts = await generateGoalSteps({
      title: goal.title,
      goalType: goal.goalType,
      note: existing.note,
      careerTitle,
    });

    const steps = buildSteps(stepTexts);
    const description = encodeGoalDescription({ note: existing.note, steps });

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: { description },
    });

    await trackEvent({
      userId: user.id,
      eventName: 'goal_updated',
      entityType: 'goal',
      entityId: goal.id,
    });

    return NextResponse.json({ goal: updated, steps });
  } catch (error) {
    captureApiError(error, { route: 'member/goals/[id]/steps POST' });
    return NextResponse.json({ error: 'Failed to generate steps' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

const patchSchema = z.object({
  stepId: z.string().min(1).max(64),
  done: z.boolean(),
});

/**
 * PATCH — toggle a single step's completion.
 */
async function _PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const goal = await loadOwnedGoal(id, user.id);
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }

    const payload = parseGoalDescription(goal.description);
    const idx = payload.steps.findIndex((s) => s.id === parsed.data.stepId);
    if (idx === -1) return NextResponse.json({ error: 'Step not found' }, { status: 404 });

    payload.steps[idx] = { ...payload.steps[idx], done: parsed.data.done };
    const description = encodeGoalDescription(payload);

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: { description },
    });

    const allDone = payload.steps.length > 0 && payload.steps.every((s) => s.done);
    if (parsed.data.done) {
      await trackEvent({
        userId: user.id,
        eventName: 'goal_updated',
        entityType: 'goal',
        entityId: goal.id,
      });
    }

    return NextResponse.json({ goal: updated, steps: payload.steps, allDone });
  } catch (error) {
    captureApiError(error, { route: 'member/goals/[id]/steps PATCH' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

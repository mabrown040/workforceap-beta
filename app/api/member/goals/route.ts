import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';
import { captureApiError } from '@/lib/observability/captureApiError';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { parseGoalDescription } from '@/lib/member/goalSteps';
import { suggestGoalsFromCareer } from '@/lib/member/suggestGoalsFromCareer';
import { careerMatchResultNullableSchema } from '@/lib/validation/careerMatchResult';
import { createApiErrorResponse, createUnauthorizedResponse, createNotFoundResponse } from '@/lib/api-utils';
import { withIdempotency } from '@/lib/api-utils';
import { Prisma } from '@prisma/client';

const goalSelect = Prisma.validator<Prisma.GoalSelect>()({
  id: true,
  goalType: true,
  title: true,
  description: true,
  targetMetricType: true,
  targetMetricValue: true,
  targetDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  userId: true,
});

const createSchema = z.object({
  goalType: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  targetMetricType: z.string().max(50).optional(),
  targetMetricValue: z.number().int().min(0).optional(),
  targetDate: z.string().datetime().optional().nullable(),
});async function _GET() {
  try {
    const user = await getUser();
    if (!user) return createUnauthorizedResponse();

    try {
      await ensureUserInDb(user);
      const profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: { careerRecommendationJson: true },
      });
      const careerRec = careerMatchResultNullableSchema.safeParse(profile?.careerRecommendationJson).data ?? null;
      const suggestions = suggestGoalsFromCareer(careerRec);
      const rawGoals = await prisma.goal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: goalSelect,
      });
      // Decode the structured steps envelope from description so the client
      // gets first-class steps + a clean note (no schema change required).
      const goals = rawGoals.map((g) => {
        const { note, steps } = parseGoalDescription(g.description);
        return { ...g, description: note || null, steps };
      });
      // Hide suggestions whose goal-type the member already has active.
      const activeTypes = new Set(
        goals.filter((g) => g.status === 'ACTIVE').map((g) => g.goalType)
      );
      const openSuggestions = suggestions.filter((s) => !activeTypes.has(s.goalType));
      return NextResponse.json({ goals, suggestions: openSuggestions });
    } catch (err) {
      captureApiError(err, { route: 'member/goals GET' });
      return createApiErrorResponse('Failed to load goals', 'INTERNAL_ERROR', 500);
    }
  } catch (error) {
    console.error('/member/goals:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return createUnauthorizedResponse();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createApiErrorResponse('Invalid JSON', 'VALIDATION_ERROR', 400);
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return createApiErrorResponse(parsed.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    const { goalType, title, description, targetMetricType, targetMetricValue, targetDate } = parsed.data;

    const existingCount = await prisma.goal.count({
      where: { userId: user.id, status: 'ACTIVE' },
    });
    if (existingCount >= 3) {
      return createApiErrorResponse('You can have at most 3 active goals', 'VALIDATION_ERROR', 400);
    }

    try {
      await ensureUserInDb(user);
      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          goalType,
          title,
          description: description ?? null,
          targetMetricType: targetMetricType ?? null,
          targetMetricValue: targetMetricValue ?? null,
          targetDate: targetDate ? new Date(targetDate) : null,
        },
      });
      await trackEvent({ userId: user.id, eventName: 'goal_created', entityType: 'goal', entityId: goal.id });
      return NextResponse.json({ goal });
    } catch (err) {
      captureApiError(err, { route: 'member/goals POST' });
      return createApiErrorResponse('Failed to create goal', 'INTERNAL_ERROR', 500);
    }
  } catch (error) {
    console.error('/member/goals:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
export const POST = withApiGuc(withIdempotency(_POST));

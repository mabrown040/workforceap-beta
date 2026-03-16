import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';

const createSchema = z.object({
  goalType: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  targetMetricType: z.string().max(50).optional(),
  targetMetricValue: z.number().int().min(0).optional(),
  targetDate: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureUserInDb(user);
    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ goals });
  } catch (err) {
    console.error('[GET /api/member/goals]', err);
    return NextResponse.json({ error: 'Failed to load goals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { goalType, title, description, targetMetricType, targetMetricValue, targetDate } = parsed.data;

  const existingCount = await prisma.goal.count({
    where: { userId: user.id, status: 'ACTIVE' },
  });
  if (existingCount >= 3) {
    return NextResponse.json({ error: 'You can have at most 3 active goals' }, { status: 400 });
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
    console.error('[POST /api/member/goals]', err);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

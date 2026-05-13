import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  pathwayId: z.string().min(1),
  progress: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

export async function GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const progress = await prisma.learningProgress.findMany({
    where: { userId: user.id },
    take: 100,
  });
  return NextResponse.json({ progress });

  } catch (error) {
    console.error('/member/learning-progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  const { pathwayId, progress, completed } = parsed.data;

  const record = await prisma.learningProgress.upsert({
    where: {
      userId_pathwayId: { userId: user.id, pathwayId },
    },
    create: {
      userId: user.id,
      pathwayId,
      progress: progress ?? 0,
      completed: completed ?? false,
    },
    update: {
      ...(progress !== undefined && { progress }),
      ...(completed !== undefined && { completed }),
    },
  });

  return NextResponse.json({ progress: record });

  } catch (error) {
    console.error('/member/learning-progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


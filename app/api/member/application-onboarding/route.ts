import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  programInterest: z.string().min(1).max(500),
});export const PATCH = withApiGuc(async (request: Request) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { programInterest } = parsed.data;

  const latest = await prisma.$transaction((tx) => tx.application.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  }));

  if (latest) {
    await prisma.$transaction((tx) => tx.application.update({
      where: { id: latest.id },
      data: { programInterest },
    }));
  } else {
    await prisma.$transaction((tx) => tx.application.create({
      data: {
        userId: user.id,
        programInterest,
        status: ApplicationStatus.PENDING,
        submittedAt: new Date(),
      },
    }));
  }

  await prisma.$transaction((tx) => tx.user.update({
    where: { id: user.id },
    data: { programInterest },
  }));

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/member/application-onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


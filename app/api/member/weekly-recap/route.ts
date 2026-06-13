import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getWeekBounds, generateWeeklyRecap } from '@/lib/recap/generate';
import { Prisma } from '@prisma/client';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { createApiErrorResponse, createUnauthorizedResponse } from '@/lib/api-utils';
import { withIdempotency } from '@/lib/api-utils';

const weeklyRecapSelect = Prisma.validator<Prisma.WeeklyRecapSelect>()({
  id: true,
  userId: true,
  weekStartDate: true,
  weekEndDate: true,
  recapJson: true,
  goalsSnapshotJson: true,
  readinessScoreSnapshot: true,
  openedAt: true,
  generatedAt: true,
  createdAt: true,
  // Note: updatedAt does not exist on WeeklyRecap model (generatedAt tracks creation)
});

async function _GET() {
  try {
  const user = await getUser();
  if (!user) return createUnauthorizedResponse();

  try {
    const { start } = getWeekBounds(new Date());

    let recap = await prisma.$transaction((tx) => tx.weeklyRecap.findUnique({
      where: { userId_weekStartDate: { userId: user.id, weekStartDate: start } },
      select: weeklyRecapSelect,
    }));

    if (!recap) {
      recap = await generateWeeklyRecap(user.id, start);
    }

    return NextResponse.json({ recap });
  } catch {
    return createApiErrorResponse('Failed to load weekly recap', 'INTERNAL_ERROR', 500);
  }

  } catch (error) {
    console.error('/member/weekly-recap error:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
export const GET = withApiGuc(_GET);

async function _POST() {
  try {
  const user = await getUser();
  if (!user) return createUnauthorizedResponse();

  try {
    const { start, end } = getWeekBounds(new Date());
    const recap = await generateWeeklyRecap(user.id, start, end);
    return NextResponse.json({ recap });
  } catch {
    return createApiErrorResponse('Failed to generate weekly recap', 'INTERNAL_ERROR', 500);
  }

  } catch (error) {
    console.error('/member/weekly-recap error:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
export const POST = withApiGuc(withIdempotency(_POST));

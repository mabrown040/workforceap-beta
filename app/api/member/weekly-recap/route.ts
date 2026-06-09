import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getWeekBounds, generateWeeklyRecap } from '@/lib/recap/generate';
import { Prisma } from '@prisma/client';
import { withApiGuc } from '@/lib/db/withRequestGuc';const weeklyRecapSelect = Prisma.validator<Prisma.WeeklyRecapSelect>()({
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
  updatedAt: true,
});

async function _GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { start } = getWeekBounds(new Date());

    let recap = await prisma.weeklyRecap.findUnique({
      where: { userId_weekStartDate: { userId: user.id, weekStartDate: start } },
      select: weeklyRecapSelect,
    });

    if (!recap) {
      recap = await generateWeeklyRecap(user.id, start);
    }

    return NextResponse.json({ recap });
  } catch {
    return NextResponse.json({ error: 'Failed to load weekly recap' }, { status: 500 });
  }

  } catch (error) {
    console.error('/member/weekly-recap error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { start, end } = getWeekBounds(new Date());
    const recap = await generateWeeklyRecap(user.id, start, end);
    return NextResponse.json({ recap });
  } catch {
    return NextResponse.json({ error: 'Failed to generate weekly recap' }, { status: 500 });
  }

  } catch (error) {
    console.error('/member/weekly-recap error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);


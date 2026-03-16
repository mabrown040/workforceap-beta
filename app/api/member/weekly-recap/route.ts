import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getWeekBounds, generateWeeklyRecap } from '@/lib/recap/generate';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { start } = getWeekBounds(new Date());

  let recap = await prisma.weeklyRecap.findUnique({
    where: { userId_weekStartDate: { userId: user.id, weekStartDate: start } },
  });

  if (!recap) {
    recap = await generateWeeklyRecap(user.id, start);
  }

  return NextResponse.json({ recap });
}

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { start, end } = getWeekBounds(new Date());
  const recap = await generateWeeklyRecap(user.id, start, end);
  return NextResponse.json({ recap });
}

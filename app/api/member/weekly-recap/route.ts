import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getWeekBounds, generateWeeklyRecap } from '@/lib/recap/generate';

export async function GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { start } = getWeekBounds(new Date());

    let recap = await prisma.weeklyRecap.findUnique({
      where: { userId_weekStartDate: { userId: user.id, weekStartDate: start } },
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


export async function POST() {
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


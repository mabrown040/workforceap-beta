import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: mentorId } = await params;

  const sessions = await prisma.$transaction((tx) => tx.mentorSession.findMany({
    where: { mentorId, memberId: user.id },
    orderBy: { scheduledAt: 'desc' },
    take: 100,
  }));

  return NextResponse.json({ sessions });

  } catch (error) {
    console.error('/mentors/[id]/sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: mentorId } = await params;
  const body = await req.json() as { scheduledAt: string; topic?: string; durationMin?: number };

  const session = await prisma.$transaction((tx) => tx.mentorSession.create({
    data: {
      mentorId,
      memberId: user.id,
      scheduledAt: new Date(body.scheduledAt),
      durationMin: body.durationMin ?? 30,
      notes: body.topic ?? null,
      status: 'PENDING',
    },
  }));

  return NextResponse.json({ session }, { status: 201 });

  } catch (error) {
    console.error('/mentors/[id]/sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);


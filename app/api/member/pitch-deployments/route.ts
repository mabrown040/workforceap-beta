import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const deployments = await prisma.memberEvent.findMany({
    where: { userId: user.id, eventName: 'pitch_deployed' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, metadata: true, createdAt: true },
  });

  return NextResponse.json({ deployments });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { employer?: string; usedAt?: string; outcome?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { employer, usedAt, outcome } = body;

  if (!employer || typeof employer !== 'string' || employer.trim().length === 0) {
    return NextResponse.json({ error: 'employer is required' }, { status: 400 });
  }

  const VALID_OUTCOMES = ['interview', 'no_response', 'pending', 'other'];
  if (outcome && !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: 'invalid outcome' }, { status: 400 });
  }

  const event = await prisma.memberEvent.create({
    data: {
      userId: user.id,
      eventName: 'pitch_deployed',
      entityType: 'elevator_pitch',
      sourcePage: '/dashboard/ai-tools/elevator-pitch',
      metadata: {
        employer: employer.trim().slice(0, 200),
        usedAt: usedAt ?? new Date().toISOString(),
        outcome: outcome ?? 'pending',
      },
    },
    select: { id: true, metadata: true, createdAt: true },
  });

  return NextResponse.json({ deployment: event });
}

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sessions = await prisma.mentorSession.findMany({
      where: { mentorId: id, memberId: user.id },
      orderBy: { scheduledAt: 'desc' },
    });
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('Sessions GET error:', err);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const mentor = await prisma.mentor.findFirst({ where: { id, isActive: true } });
    if (!mentor) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });

    const body = await req.json();
    const { scheduledAt, durationMin, topic } = body;
    if (!scheduledAt) return NextResponse.json({ error: 'scheduledAt required' }, { status: 400 });

    const session = await prisma.mentorSession.create({
      data: {
        mentorId: id,
        memberId: user.id,
        scheduledAt: new Date(scheduledAt),
        durationMin: durationMin || 30,
        topic: topic || null,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error('Session create error:', err);
    return NextResponse.json({ error: 'Failed to request session' }, { status: 500 });
  }
}

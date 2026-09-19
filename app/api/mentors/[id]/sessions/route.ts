import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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
export const GET = withApiGuc(_GET);

const MAX_TOPIC_CHARS = 4000;

/**
 * Body sent by components/portal/MentorSessionForm: `scheduledAt` is a
 * datetime-local string, `topic` free text. Anything else (empty date, wrong
 * types, non-object JSON) used to reach Prisma and surface as a 500.
 */
const createSessionSchema = z.object({
  scheduledAt: z
    .string()
    .trim()
    .min(1, 'Pick a date and time for the session')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Pick a valid date and time for the session'),
  topic: z.string().trim().max(MAX_TOPIC_CHARS).optional().nullable(),
  durationMin: z.number().int().min(15).max(480).optional().nullable(),
});

async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: mentorId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid session request' },
      { status: 400 },
    );
  }

  // Only mentors the member can see on /dashboard/mentors (GET /api/mentors)
  // accept session requests; an unknown or inactive id is a 404, not a
  // foreign-key failure.
  const mentor = await prisma.$transaction((tx) => tx.mentor.findFirst({
    where: { id: mentorId, isActive: true, approvedAt: { not: null } },
    select: { id: true },
  }));
  if (!mentor) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });

  const session = await prisma.$transaction((tx) => tx.mentorSession.create({
    data: {
      mentorId: mentor.id,
      memberId: user.id,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMin: parsed.data.durationMin ?? 30,
      notes: parsed.data.topic || null,
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


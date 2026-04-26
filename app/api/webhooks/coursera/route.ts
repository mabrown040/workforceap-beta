import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCourseraReadiness } from '@/lib/coursera/config';
import { completeMemberCourse } from '@/lib/member/courseCompletion';

const webhookSchema = z
  .object({
    secret: z.string().optional(),
    externalUserId: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    courseSlug: z.string().trim().min(1).optional(),
    courseName: z.string().trim().min(1).optional(),
    completed: z.boolean().optional(),
    progressPercent: z.number().min(0).max(100).optional(),
  })
  .refine((value) => value.externalUserId || value.email, {
    message: 'externalUserId or email is required',
    path: ['externalUserId'],
  })
  .refine((value) => value.courseSlug || value.courseName, {
    message: 'courseSlug or courseName is required',
    path: ['courseSlug'],
  });

export async function POST(request: Request) {
  const readiness = getCourseraReadiness(null);
  if (!readiness.canReceiveWebhooks) {
    return NextResponse.json({ error: 'Coursera webhook is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const headerSecret = request.headers.get('x-coursera-webhook-secret')?.trim();
  const bodySecret = parsed.data.secret?.trim();
  const expectedSecret = process.env.COURSERA_WEBHOOK_SECRET?.trim() || process.env.WEBHOOK_SECRET?.trim() || '';
  const providedSecret = headerSecret || bodySecret;

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const member = parsed.data.externalUserId
    ? await prisma.user.findUnique({ where: { id: parsed.data.externalUserId }, select: { id: true } })
    : await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const shouldComplete = parsed.data.completed === true || parsed.data.progressPercent === 100;
  if (!shouldComplete) {
    return NextResponse.json({ ok: true, received: true, completed: false, userId: member.id });
  }

  try {
    const result = await completeMemberCourse({
      userId: member.id,
      courseSlug: parsed.data.courseSlug,
      courseName: parsed.data.courseName,
      source: 'coursera-webhook',
    });

    return NextResponse.json({
      received: true,
      completed: true,
      userId: member.id,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process Coursera completion';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

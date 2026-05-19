import { NextResponse } from 'next/server';
import { z } from 'zod';

import { upsertCourseraEnrollmentProgress } from '@/lib/coursera/completionEngine';
import { verifyCourseraRestWebhookAuth } from '@/lib/coursera/webhookAuth';
import { prisma } from '@/lib/db/prisma';
import { withSystemGuc } from '@/lib/db/withRequestGuc';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { checkWebhookRateLimit } from '@/lib/rate-limit';

const webhookSchema = z
  .object({
    /** Legacy shared secret in body — prefer HMAC signature headers. */
    secret: z.string().optional(),
    userId: z.string().uuid().optional(),
    /** When equal to a WorkforceAP `users.id`, used instead of `userId`. */
    externalUserId: z.string().trim().min(1).optional(),
    courseId: z.string().trim().min(1),
    progressPercent: z.number().min(0).max(100).optional(),
    completed: z.boolean().optional(),
    enrolledAt: z.string().datetime().optional(),
  })
  .refine((value) => Boolean(value.userId) || Boolean(value.externalUserId), {
    message: 'userId or externalUserId is required',
    path: ['userId'],
  });

function resolveWebhookSecret(): string {
  return (
    process.env.COURSERA_WEBHOOK_SECRET?.trim()
    || process.env.WEBHOOK_SECRET?.trim()
    || ''
  );
}

function redactBodyForAudit(body: Record<string, unknown>): Record<string, unknown> {
  const { secret: _omit, ...rest } = body;
  return rest;
}

/**
 * Coursera completion engine webhook (stub path).
 * HMAC-verified progress updates → `coursera_enrollments`.
 *
 * Distinct from `POST /api/webhooks/coursera` (xAPI-aligned REST completion).
 */
export async function POST(request: Request) {
  return withSystemGuc(async () => {
    const expectedSecret = resolveWebhookSecret();
    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'Coursera webhook is not configured' },
        { status: 503 }
      );
    }

    const ip = getClientIpFromRequest(request);
    const { success: withinLimit } = await checkWebhookRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    let rawBody = '';
    try {
      rawBody = await request.text();
    } catch {
      return NextResponse.json({ error: 'Unable to read body' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const record = body as Record<string, unknown>;
    const parsed = webhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const auth = verifyCourseraRestWebhookAuth({
      request,
      rawBody,
      expectedSecret,
      bodySecret: typeof record.secret === 'string' ? record.secret : null,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = parsed.data;
    const userId = data.userId ?? data.externalUserId!;
    const userExists = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!userExists) {
      return NextResponse.json({ acknowledged: true, matched: false }, { status: 200 });
    }

    const enrollment = await upsertCourseraEnrollmentProgress({
      userId,
      courseId: data.courseId,
      progressPercent: data.progressPercent ?? (data.completed ? 100 : 0),
      completed: data.completed,
      enrolledAt: data.enrolledAt ? new Date(data.enrolledAt) : undefined,
    });

    return NextResponse.json({
      acknowledged: true,
      matched: true,
      enrollmentId: enrollment.id,
      lastProgressPct: enrollment.lastProgressPct,
      completedAt: enrollment.completedAt?.toISOString() ?? null,
      authMethod: auth.method,
      audit: redactBodyForAudit(record),
    });
  });
}

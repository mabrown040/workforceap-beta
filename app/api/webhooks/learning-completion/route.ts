import { NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';
import { z } from 'zod';
import { checkWebhookRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { handleLearningCompletion } from '@/lib/workflows/careerOS';
import { logWebhookEvent } from '@/lib/webhooks/logEvent';
import { markWebhookForRetry } from '@/lib/webhooks/retry';
import { prisma } from '@/lib/db/prisma';

import { withSystemGuc } from '@/lib/db/withRequestGuc';

import { withRouteObservability } from '@/lib/api/routeObservability';

export const webhookSchema = z.object({
  memberId: z.string().trim().min(1),
  courseName: z.string().trim().min(1),
  eventId: z.string().trim().min(1).optional(),
});

export function verifyWebhookSecret(req: Request): boolean {
  const providedSecret = req.headers.get('x-webhook-secret') || '';
  const expectedSecret = process.env.WEBHOOK_SECRET || '';

  // Fail-closed when either side is empty. Without this guard,
  // SHA256('') === SHA256('') and an unset WEBHOOK_SECRET grants
  // anonymous access to anyone sending an empty x-webhook-secret header.
  if (!expectedSecret || !providedSecret) return false;

  // Use crypto.timingSafeEqual to prevent timing attacks.
  // Normalize lengths first so timingSafeEqual doesn't throw on mismatched lengths.
  const expected = createHash('sha256').update(expectedSecret, 'utf8').digest();
  const actual = createHash('sha256').update(providedSecret, 'utf8').digest();
  return timingSafeEqual(actual, expected);
}

export function buildDedupeKey(data: z.infer<typeof webhookSchema>, rawBody: string): string {
  const stable = data.eventId?.trim();
  if (stable) return `wh:learning-completion:${stable}`;
  return `wh:learning-completion:${createHash('sha256').update(rawBody, 'utf8').digest('hex')}`;
}

export async function checkIdempotency(dedupeKey: string): Promise<'fresh' | 'already_processed'> {
  // Use xapi_statement table for idempotency tracking (synthetic verb)
  const existing = await prisma.xapiStatement.findUnique({
    where: { statementId: dedupeKey },
    select: { processed: true },
  });
  if (existing?.processed) return 'already_processed';
  if (existing) {
    // Mid-flight retry — the original delivery created the idempotency row
    // but failed before flipping `processed` to true. Return `fresh` so the
    // caller actually re-runs handleLearningCompletion. The previous
    // implementation marked the row as processed and returned
    // already_processed, which silently dropped every transient failure's
    // retry — losing real learning-completion events on flake.
    return 'fresh';
  }

  try {
    await prisma.xapiStatement.create({
      data: {
        statementId: dedupeKey,
        actorEmail: null,
        verb: 'workforceap.learning-completion.webhook',
        courseId: null,
        courseName: null,
        resultScoreScaled: null,
        resultScoreRaw: null,
        resultCompletion: null,
        resultSuccess: null,
        processed: false,
      },
    });
    return 'fresh';
  } catch (error: unknown) {
    // Race condition: another request created it concurrently
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return 'already_processed';
    }
    throw error;
  }
}export const POST = withRouteObservability(async (req: Request) => {
  return withSystemGuc(async () => {
  const startTime = Date.now();
  let rawBody = '';
  let eventId: string | undefined;
  let payloadSize = 0;

  try {
    const ip = getClientIpFromRequest(req);
    const { success: withinLimit } = await checkWebhookRateLimit(ip);
    if (!withinLimit) {
      await logWebhookEvent({
        source: 'learning-completion',
        status: 'failed',
        payloadSize: 0,
        httpStatusCode: 429,
        errorMessage: 'Rate limited',
        processingTimeMs: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Verify secret before reading/parsing body (fail fast on auth)
    if (!verifyWebhookSecret(req)) {
      await logWebhookEvent({
        source: 'learning-completion',
        status: 'failed',
        payloadSize: 0,
        httpStatusCode: 401,
        errorMessage: 'Unauthorized',
        processingTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      rawBody = await req.text();
      payloadSize = Buffer.byteLength(rawBody, 'utf8');
    } catch {
      await logWebhookEvent({
        source: 'learning-completion',
        status: 'failed',
        payloadSize: 0,
        httpStatusCode: 400,
        errorMessage: 'Unable to read body',
        processingTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Unable to read body' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      await logWebhookEvent({
        source: 'learning-completion',
        status: 'failed',
        payloadSize,
        httpStatusCode: 400,
        errorMessage: 'Invalid JSON',
        processingTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = webhookSchema.safeParse(body);
    if (!parsed.success) {
      await logWebhookEvent({
        source: 'learning-completion',
        status: 'failed',
        payloadSize,
        httpStatusCode: 400,
        errorMessage: `Validation failed: ${JSON.stringify(parsed.error.flatten())}`,
        processingTimeMs: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    eventId = data.eventId;
    const dedupeKey = buildDedupeKey(data, rawBody);

    const idempotency = await checkIdempotency(dedupeKey);
    if (idempotency === 'already_processed') {
      await logWebhookEvent({
        source: 'learning-completion',
        eventType: 'learning.completion',
        eventId,
        payloadSize,
        status: 'success',
        httpStatusCode: 200,
        processingTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({
        success: true,
        duplicate: true,
        dedupeKey,
      });
    }

    const result = await handleLearningCompletion(data.memberId.trim(), data.courseName.trim());

    // Mark idempotency row as processed on success
    await prisma.xapiStatement.updateMany({
      where: { statementId: dedupeKey },
      data: { processed: true, processedAt: new Date() },
    });

    await logWebhookEvent({
      source: 'learning-completion',
      eventType: 'learning.completion',
      eventId,
      payloadSize,
      status: 'success',
      httpStatusCode: 200,
      processingTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      actionId: result.actionId,
      created: result.created,
      duplicatedRecentAction: result.duplicatedRecentAction,
      matchedJobId: result.matchedJobId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const processingTimeMs = Date.now() - startTime;

    // Log the failure
    const logEntry = await prisma.webhookEvent.create({
      data: {
        source: 'learning-completion',
        eventType: 'learning.completion',
        eventId: eventId ?? null,
        payloadSize,
        processingTimeMs,
        status: 'failed',
        httpStatusCode: 500,
        errorMessage: message,
        retryCount: 0,
      },
    });

    // Attempt to schedule retry
    const retryResult = await markWebhookForRetry(logEntry.id, 0, message);

    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', retryScheduled: retryResult === 'scheduled' },
      { status: 500 }
    );
    }
  });
});

import { timingSafeEqual, createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

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

export async function checkIdempotency(
  dedupeKey: string,
  payload?: z.infer<typeof webhookSchema>
): Promise<'fresh' | 'already_processed'> {
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
        courseName: payload?.courseName.trim() ?? null,
        resultScoreScaled: null,
        resultScoreRaw: null,
        resultCompletion: null,
        resultSuccess: null,
        payload: payload ?? undefined,
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
}

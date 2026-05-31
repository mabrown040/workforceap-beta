import { prisma } from '@/lib/db/prisma';
import { handleLearningCompletion } from '@/lib/workflows/careerOS';
import { getPendingRetryEvents, markWebhookForRetry, updateWebhookEventStatus } from '@/lib/webhooks/retry';
import { webhookSchema } from '../../../webhooks/learning-completion/_webhook';

type PendingRetryEvent = Awaited<ReturnType<typeof getPendingRetryEvents>>[number];
export type RetryResult = 'success' | 'failed' | 'max_retries_exceeded' | 'skipped';
type RetryProcessorDeps = {
  reprocessWebhookEvent?: (event: PendingRetryEvent) => Promise<'success' | 'skipped'>;
  markForRetry?: typeof markWebhookForRetry;
  updateStatus?: typeof updateWebhookEventStatus;
};

async function reprocessLearningCompletion(event: PendingRetryEvent): Promise<'success' | 'skipped'> {
  if (!event.eventId) return 'skipped';

  const statement = await prisma.xapiStatement.findUnique({
    where: { statementId: `wh:learning-completion:${event.eventId}` },
    select: { payload: true },
  });
  const parsed = webhookSchema.safeParse(statement?.payload);
  if (!parsed.success) return 'skipped';

  const data = parsed.data;
  await handleLearningCompletion(data.memberId.trim(), data.courseName.trim());
  await prisma.xapiStatement.updateMany({
    where: { statementId: `wh:learning-completion:${event.eventId}` },
    data: { processed: true, processedAt: new Date() },
  });
  return 'success';
}

async function reprocessWebhookEvent(event: PendingRetryEvent): Promise<'success' | 'skipped'> {
  if (event.source === 'learning-completion') {
    return reprocessLearningCompletion(event);
  }
  return 'skipped';
}

export async function processRetryEvent(
  event: PendingRetryEvent,
  deps: RetryProcessorDeps = {}
): Promise<{ id: string; source: string; result: RetryResult }> {
  const reprocess = deps.reprocessWebhookEvent ?? reprocessWebhookEvent;
  const updateStatus = deps.updateStatus ?? updateWebhookEventStatus;
  const markForRetry = deps.markForRetry ?? markWebhookForRetry;
  const startedAt = Date.now();

  try {
    const result = await reprocess(event);
    if (result === 'skipped') {
      return { id: event.id, source: event.source, result: 'skipped' };
    }

    await updateStatus(event.id, {
      status: 'success',
      httpStatusCode: 200,
      errorMessage: null,
      nextRetryAt: null,
      processingTimeMs: Date.now() - startedAt,
    });
    return { id: event.id, source: event.source, result: 'success' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Retry attempt failed';
    const retryResult = await markForRetry(event.id, event.retryCount, message);
    return {
      id: event.id,
      source: event.source,
      result: retryResult === 'max_retries_exceeded' ? 'max_retries_exceeded' : 'failed',
    };
  }
}

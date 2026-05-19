import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getPendingRetryEvents, markWebhookForRetry, updateWebhookEventStatus } from '@/lib/webhooks/retry';

import { withRouteObservability } from '@/lib/api/routeObservability';async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const pending = await getPendingRetryEvents(source, limit);

    const results: Array<{ id: string; source: string; result: 'success' | 'failed' | 'max_retries_exceeded' | 'skipped' }> = [];

    for (const event of pending) {
      // For now, retries are tracked but actual reprocessing requires webhook-specific logic.
      // We mark them as failed again to trigger the next retry schedule.
      // In production, each webhook source would have its own reprocessor.
      const retryResult = await markWebhookForRetry(
        event.id,
        event.retryCount,
        event.errorMessage ?? 'Retry attempt failed'
      );

      if (retryResult === 'max_retries_exceeded') {
        results.push({ id: event.id, source: event.source, result: 'max_retries_exceeded' });
      } else {
        results.push({ id: event.id, source: event.source, result: 'failed' });
      }
    }

    const byResult = results.reduce((acc, r) => {
      acc[r.result] = (acc[r.result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      processed: results.length,
      summary: byResult,
      results,
    });
  } catch (error) {
    console.error('[admin/webhooks/process-retries] Error:', error);
    return NextResponse.json({ error: 'Failed to process retries' }, { status: 500 });
  }
}
export const POST = withRouteObservability(_POST);async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const pending = await getPendingRetryEvents(source, limit);

    return NextResponse.json({
      count: pending.length,
      events: pending.map((e) => ({
        id: e.id,
        source: e.source,
        eventType: e.eventType,
        eventId: e.eventId,
        retryCount: e.retryCount,
        nextRetryAt: e.nextRetryAt?.toISOString(),
        errorMessage: e.errorMessage,
      })),
    });
  } catch (error) {
    console.error('[admin/webhooks/process-retries] Error:', error);
    return NextResponse.json({ error: 'Failed to load pending retries' }, { status: 500 });
  }
}
export const GET = withRouteObservability(_GET);

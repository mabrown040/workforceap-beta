import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getPendingRetryEvents } from '@/lib/webhooks/retry';
import { processRetryEvent, type RetryResult } from './_processRetries';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

/**
 * Admin endpoint to process pending webhook retries.
 * Can be invoked by cron or manually from the admin UI.
 *
 * Returns summary of processed retries without exposing raw payload data.
 */
async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const pending = await getPendingRetryEvents(source, limit);

    const results: Array<{ id: string; source: string; result: RetryResult }> = [];

    for (const event of pending) {
      results.push(await processRetryEvent(event));
    }

    const byResult = results.reduce((acc, r) => {
      acc[r.result] = (acc[r.result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    await auditLog({
      actorUserId: user.id,
      action: 'webhook_retries_process',
      targetType: 'system',
      targetId: 'webhooks',
      metadata: { source, limit, processed: results.length, summary: byResult },
    });
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
export const POST = withApiGuc(_POST);

/**
 * GET pending retry count for dashboard badges / monitoring.
 */
export async function GET(request: NextRequest) {
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

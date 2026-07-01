import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getPendingRetryEvents } from '@/lib/webhooks/retry';
import { processRetryEvent, type RetryResult } from './_processRetries';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';

/**
 * Admin endpoint to process pending webhook retries.
 * Invoked on a schedule by Vercel cron (see vercel.json, guarded by
 * CRON_SECRET via authorizeCronRequest — same pattern as /api/cron/*
 * routes) or manually from the admin UI (session-based admin auth).
 *
 * Vercel cron issues GET requests, so both GET and POST run the same
 * processing logic (matching the GET+POST convention used by every route
 * under /api/cron/*).
 *
 * Returns summary of processed retries without exposing raw payload data.
 */
async function handle(request: NextRequest) {
  try {
    const user = await getUser();
    const isAuthedAdmin = !!user && (await isAdmin(user.id));
    if (!isAuthedAdmin && authorizeCronRequest(request)) {
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

    const actorId = user?.id ?? 'cron';
    void auditLog({ actorUserId: actorId, action: 'admin_webhook_retries_processed', targetType: 'User', targetId: actorId, metadata: { processed: results.length, triggeredBy: user ? 'admin' : 'cron' } }).catch(() => {});
    logAuditEvent({ user: { id: actorId, role: 'admin' }, verb: 'created', object: { type: 'WebhookRetryBatch', id: actorId }, result: { success: true } }).catch(() => {});
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

export const GET = handle;
export const POST = handle;

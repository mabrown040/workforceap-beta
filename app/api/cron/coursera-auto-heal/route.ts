import { NextResponse } from 'next/server';
import { autoHealUnmatchedXapiEvents } from '@/lib/xapi/reprocess';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';

/**
 * GET / POST /api/cron/coursera-auto-heal
 *
 * Periodic auto-heal pass over `coursera_xapi_events` rows with
 * `completion_status = 'unmatched'`. For each event, looks up the actor email
 * in `users.email` (case-insensitive); if a match exists, creates an
 * identity mapping and re-processes the event so the underlying training
 * progress is bound to the right member.
 *
 * Why this is on a cron: previously the auto-heal endpoint was POST-only and
 * fire-on-demand from the admin UI. Unmatched events accumulated for hours
 * (sometimes days) until someone clicked it. With this cron, events are
 * healed within an hour of arrival.
 *
 * Schedule: hourly (configure in vercel.json — `0 * * * *`).
 * Auth: standard CRON_SECRET via withCronLogging.
 *
 * Caps the batch at 200 per run so a backlog spike doesn't blow the
 * function timeout. The reprocess pipeline orders newest-first.
 */
async function handle(_request: Request) {
  const result = await autoHealUnmatchedXapiEvents(200);
  const runResult = {
    ok: true,
    checkedAt: new Date().toISOString(),
    processed: result.processed,
    matched: result.matched,
    errors: result.errors,
  };
  await logCronRun('cron_coursera_auto_heal', runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_coursera_auto_heal', handle);
export const POST = withCronLogging('cron_coursera_auto_heal', handle);

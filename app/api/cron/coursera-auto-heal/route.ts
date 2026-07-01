import { NextResponse } from 'next/server';
import {
  autoHealUnmatchedXapiEvents,
  reprocessIgnoredXapiEventsWithMappings,
} from '@/lib/xapi/reprocess';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { loadB4BContents } from '@/lib/coursera/programContentsCache';
import { seedCanonicalMappingsFromB4B } from '@/lib/coursera/seedCanonicalMappingsFromB4B';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * GET / POST /api/cron/coursera-auto-heal
 *
 * Hourly maintenance pass that does two things:
 *
 *   1. Heal unmatched `coursera_xapi_events` rows: looks up the actor email
 *      in `users.email` (case-insensitive); on match, creates an identity
 *      mapping and re-processes the event so progress promotes.
 *   2. Refresh canonical course mappings from the live B4B program
 *      directory (idempotent upsert on `courseraCourseId`). Closes the
 *      "11 / 19 catalog programs have zero canonical mappings" gap on
 *      hourly cadence rather than the 6-hourly `cron_coursera_b4b_sync`.
 *      Best-effort — a B4B credential / network blip is captured + logged
 *      but doesn't fail the heal pass.
 *
 * Schedule: hourly (configure in vercel.json — `15 * * * *`).
 * Auth: standard CRON_SECRET via withCronLogging.
 */
async function handle(_request: Request) {
  let result: { processed: number; matched: number; errors: number } = {
    processed: 0,
    matched: 0,
    errors: 0,
  };
  try {
    result = await autoHealUnmatchedXapiEvents(200);
  } catch (err) {
    captureApiError(err, {
      route: 'cron/coursera-auto-heal',
      extra: { step: 'unmatched-heal' },
    });
  }

  // Pre-step: refresh canonical mappings from the live B4B directory so the
  // ignored-replay below picks up newly-mapped course slugs in the same tick.
  let canonicalSeed:
    | { matched: number; unmatched: number; created: number; updated: number }
    | { error: string } = { matched: 0, unmatched: 0, created: 0, updated: 0 };
  try {
    const contents = await loadB4BContents();
    const seed = await seedCanonicalMappingsFromB4B({ contents, actorUserId: null });
    canonicalSeed = {
      matched: seed.coursesMatched,
      unmatched: seed.coursesUnmatched,
      created: seed.totalCreated,
      updated: seed.totalUpdated,
    };
  } catch (err) {
    captureApiError(err, {
      route: 'cron/coursera-auto-heal',
      extra: { step: 'canonical-seed' },
    });
    canonicalSeed = {
      error: err instanceof Error ? err.message : 'canonical seed failed',
    };
  }

  // Drain `'ignored'` events whose course_slug is now mapped. Skipped if the
  // helper itself fails — the unmatched-heal pass above is the primary work.
  let ignoredReplay:
    | { processed: number; matched: number; errors: number }
    | { error: string } = { processed: 0, matched: 0, errors: 0 };
  try {
    const ignored = await reprocessIgnoredXapiEventsWithMappings(150);
    ignoredReplay = {
      processed: ignored.processed,
      matched: ignored.matched,
      errors: ignored.errors,
    };
  } catch (err) {
    captureApiError(err, {
      route: 'cron/coursera-auto-heal',
      extra: { step: 'ignored-replay' },
    });
    ignoredReplay = {
      error: err instanceof Error ? err.message : 'ignored replay failed',
    };
  }

  const runResult = {
    ok: true,
    checkedAt: new Date().toISOString(),
    processed: result.processed,
    matched: result.matched,
    errors: result.errors,
    canonicalSeed,
    ignoredReplay,
  };
  await setCronRecordsProcessed(result.processed);
  await logCronRun('cron_coursera_auto_heal', runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_coursera_auto_heal', handle);
export const POST = withCronLogging('cron_coursera_auto_heal', handle);

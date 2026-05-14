import { NextResponse } from 'next/server';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { runDataCleanup } from '@/lib/retention/cleanup';

/**
 * GET /api/cron/data-cleanup
 *
 * Daily automated data retention cleanup.
 * Deletes expired log/telemetry rows in batches and hard-deletes
 * soft-deleted accounts past the legal-hold period.
 *
 * Secured by CRON_SECRET.
 */
async function handle(_request: Request) {
  const report = await runDataCleanup();

  console.log('[data-cleanup] Report:', JSON.stringify(report));

  await setCronRecordsProcessed(report.totalDeleted);
  await logCronRun('data_cleanup', report, 'ok');

  return NextResponse.json({
    ok: true,
    totalDeleted: report.totalDeleted,
    deletedAccounts: report.deletedAccounts,
    results: report.results,
  });
}

export const GET = withCronLogging('data_cleanup', handle);
export const POST = withCronLogging('data_cleanup', handle);

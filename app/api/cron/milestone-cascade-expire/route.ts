import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { withCronLogging } from '@/lib/cron/withCronLogging';
import { logCronRun } from '@/lib/admin/logCronRun';
import { expireStaleCascades } from '@/lib/milestoneCascade/expireStaleCascades';

/**
 * Daily cron that ages out `awaiting_approval` cascades past their 72h TTL.
 *
 * Reads:  milestone_cascades WHERE status='awaiting_approval' AND expires_at < now()
 * Writes: status → 'expired' with a `[auto-expired:ttl]` prefix on dismissed_reason.
 */

const WORKFLOW_KEY = 'milestone_cascade_expire';

async function handle(_req: NextRequest) {
  const result = await expireStaleCascades();

  await logCronRun(WORKFLOW_KEY, { expired: result.expired }, 'ok');

  return NextResponse.json(result);
}

export const GET = withCronLogging(WORKFLOW_KEY, handle);
export const POST = withCronLogging(WORKFLOW_KEY, handle);

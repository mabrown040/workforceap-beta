/**
 * xAPI ingest (Coursera → WorkforceAP)
 *
 * Ops quick ref (set `ENABLE_ANALYTICS_LOGS=true` for batch console lines from `trackXapiBatchProcessed`):
 * - **Progress not updating:** verify bearer token, actor maps to a member (`resolveXapiUser` in pipeline),
 *   and the activity object matches a course in the member’s enrolled program.
 * - **Unmatched / no member:** LRS actor mbox should match the portal account email.
 * - **Wrong program:** member `enrolled_program` must match the catalog slug statements are matched against.
 * - **Manual course / program fixes:** training “Mark complete” in the member portal; program changes via admin flows.
 */
import { NextResponse } from 'next/server';

import { trackXapiBatchProcessed } from '@/lib/analytics/track';
import { handleInboundParsedStatement } from '@/lib/xapi/inboundStatementPipeline';
import {
  flattenXapiStatementPayload,
  parseXapiStatement,
} from '@/lib/xapi/statements';
import { persistXapiStatement } from '@/lib/xapi/storage';
import { parseBearerToken, verifyXapiAccessToken } from '@/lib/xapi/token';

function tailFromObjectId(objectId: string | null | undefined): string | null {
  if (!objectId) return null;
  try {
    const url = new URL(objectId);
    return url.pathname.split('/').filter(Boolean).pop() ?? null;
  } catch {
    return objectId.split('/').filter(Boolean).pop() ?? null;
  }
}

export async function POST(request: Request) {
  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
  }

  try {
    verifyXapiAccessToken(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid bearer token';
    return NextResponse.json({ error: message }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawStatements = flattenXapiStatementPayload(body);
  if (rawStatements.length === 0) {
    return NextResponse.json({ received: true, processed: 0, completions: [] });
  }

  const completions: Array<Record<string, unknown>> = [];
  let statementsHandled = 0;

  for (const raw of rawStatements) {
    const parsed = parseXapiStatement(raw);
    if (!parsed) continue;

    const verb = parsed.verbId?.trim() || 'unknown';

    const persisted = await persistXapiStatement({
      statementId: parsed.statementId,
      actorEmail: parsed.email,
      actorAccountName: parsed.actorIdentifier,
      actorHomePage: parsed.actorHomePage,
      verb,
      courseId: parsed.courseraCourseId ?? tailFromObjectId(parsed.courseObjectId),
      courseName: parsed.courseName ?? null,
      resultScoreScaled: parsed.resultScoreScaled,
      resultScoreRaw: parsed.resultScoreRaw,
      resultCompletion: parsed.resultCompletion,
      resultSuccess: parsed.resultSuccess,
      payload: raw as Record<string, never>, // raw is a parsed xAPI JSON object — Prisma.InputJsonValue at runtime
    });

    // Duplicate statementId (retries / races): row exists — skip completion side effects.
    if (persisted === 'skipped') continue;

    statementsHandled += 1;
    const { completions: batch } = await handleInboundParsedStatement(parsed);
    completions.push(...batch);
  }

  trackXapiBatchProcessed({
    statementsHandled,
    completionCount: completions.filter((c) => (c as { ok?: boolean }).ok === true).length,
  });

  return NextResponse.json({
    received: true,
    processed: statementsHandled,
    completions,
  });
}

export async function GET() {
  return NextResponse.json({
    error: 'Use POST to submit xAPI statements',
    endpoint: '/api/xapi/statements',
  }, { status: 405 });
}

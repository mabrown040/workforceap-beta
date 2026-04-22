import { NextResponse } from 'next/server';
import { completeMemberCourse } from '@/lib/member/courseCompletion';
import {
  recordXapiEvent,
  resolveXapiUser,
} from '@/lib/xapi/mappings';
import { parseCompletionStatements } from '@/lib/xapi/statements';
import { parseBearerToken, verifyXapiAccessToken } from '@/lib/xapi/token';

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

  const statements = parseCompletionStatements(body);
  if (statements.length === 0) {
    return NextResponse.json({ received: true, processed: 0, completions: [] });
  }

  const completions: Array<Record<string, unknown>> = [];

  for (const statement of statements) {
    const identity = {
      email: statement.email,
      actorIdentifier: statement.actorIdentifier,
      actorHomePage: statement.actorHomePage,
    };

    const resolvedUser = await resolveXapiUser(identity);

    if (!resolvedUser) {
      await recordXapiEvent({
        statementId: statement.statementId,
        identity,
        courseSlug: statement.courseSlug,
        courseName: statement.courseName,
        verbId: statement.verbId,
        completionStatus: 'unmatched',
        error: 'No matching member identity found',
        rawPayload: statement.rawStatement,
      });

      completions.push({
        email: statement.email,
        actorIdentifier: statement.actorIdentifier,
        statementId: statement.statementId,
        ok: false,
        error: 'Member not found',
      });
      continue;
    }

    try {
      const result = await completeMemberCourse({
        userId: resolvedUser.userId,
        courseSlug: statement.courseSlug,
        courseName: statement.courseName,
        source: 'coursera-webhook',
      });

      await recordXapiEvent({
        statementId: statement.statementId,
        identity,
        courseSlug: statement.courseSlug,
        courseName: statement.courseName,
        verbId: statement.verbId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        completionStatus: 'completed',
        rawPayload: statement.rawStatement,
      });

      completions.push({
        email: statement.email,
        actorIdentifier: statement.actorIdentifier,
        statementId: statement.statementId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process statement';

      await recordXapiEvent({
        statementId: statement.statementId,
        identity,
        courseSlug: statement.courseSlug,
        courseName: statement.courseName,
        verbId: statement.verbId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        completionStatus: 'error',
        error: message,
        rawPayload: statement.rawStatement,
      });

      completions.push({
        email: statement.email,
        actorIdentifier: statement.actorIdentifier,
        statementId: statement.statementId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        ok: false,
        error: message,
      });
    }
  }

  return NextResponse.json({
    received: true,
    processed: completions.length,
    completions,
  });
}

export async function GET() {
  return NextResponse.json({
    error: 'Use POST to submit xAPI statements',
    endpoint: '/api/xapi/statements',
  }, { status: 405 });
}

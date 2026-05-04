import { NextResponse } from 'next/server';
import { completeMemberCourse } from '@/lib/member/courseCompletion';
import { upsertCourseProgressFromXapiStatement } from '@/lib/member/courseProgress';
import { prisma } from '@/lib/db/prisma';
import {
  recordXapiEvent,
  resolveXapiUser,
} from '@/lib/xapi/mappings';
import {
  flattenXapiStatementPayload,
  isXapiCompletionVerb,
  parseXapiStatement,
} from '@/lib/xapi/statements';
import { markXapiStatementProcessed, persistXapiStatement } from '@/lib/xapi/storage';
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
    statementsHandled += 1;

    const verb = parsed.verbId?.trim() || 'unknown';

    await persistXapiStatement({
      statementId: parsed.statementId,
      actorEmail: parsed.email,
      verb,
      courseId: tailFromObjectId(parsed.courseObjectId),
      courseName: parsed.courseName ?? null,
      resultScoreScaled: parsed.resultScoreScaled,
      resultScoreRaw: parsed.resultScoreRaw,
      resultCompletion: parsed.resultCompletion,
      resultSuccess: parsed.resultSuccess,
    });

    const identity = {
      email: parsed.email,
      actorIdentifier: parsed.actorIdentifier,
      actorHomePage: parsed.actorHomePage,
    };

    const resolvedUser = await resolveXapiUser(identity);

    if (!resolvedUser) {
      await recordXapiEvent({
        statementId: parsed.statementId,
        identity,
        courseSlug: parsed.courseSlug,
        courseName: parsed.courseName,
        verbId: parsed.verbId,
        completionStatus: 'unmatched',
        error: 'No matching member identity found',
        rawPayload: parsed.rawStatement,
      });

      if (isXapiCompletionVerb(parsed)) {
        completions.push({
          email: parsed.email,
          actorIdentifier: parsed.actorIdentifier,
          statementId: parsed.statementId,
          ok: false,
          error: 'Member not found',
        });
      }

      await markXapiStatementProcessed(parsed.statementId);
      continue;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: resolvedUser.userId },
      select: { enrolledProgram: true },
    });
    const enrolledProgram = dbUser?.enrolledProgram ?? null;

    if (!enrolledProgram) {
      const message = 'No program enrolled';
      await recordXapiEvent({
        statementId: parsed.statementId,
        identity,
        courseSlug: parsed.courseSlug,
        courseName: parsed.courseName,
        verbId: parsed.verbId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        completionStatus: isXapiCompletionVerb(parsed) ? 'error' : 'ignored',
        error: isXapiCompletionVerb(parsed) ? message : undefined,
        rawPayload: parsed.rawStatement,
      });
      if (isXapiCompletionVerb(parsed)) {
        completions.push({
          email: parsed.email,
          actorIdentifier: parsed.actorIdentifier,
          statementId: parsed.statementId,
          matchedUserId: resolvedUser.userId,
          mappingMethod: resolvedUser.mappingMethod,
          ok: false,
          error: message,
        });
      }
      await markXapiStatementProcessed(parsed.statementId);
      continue;
    }

    await upsertCourseProgressFromXapiStatement({
      userId: resolvedUser.userId,
      enrolledProgramSlug: enrolledProgram,
      parsed,
    });

    if (!isXapiCompletionVerb(parsed)) {
      await recordXapiEvent({
        statementId: parsed.statementId,
        identity,
        courseSlug: parsed.courseSlug,
        courseName: parsed.courseName,
        verbId: parsed.verbId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        completionStatus: 'ignored',
        rawPayload: parsed.rawStatement,
      });
      await markXapiStatementProcessed(parsed.statementId);
      continue;
    }

    try {
      const result = await completeMemberCourse({
        userId: resolvedUser.userId,
        courseSlug: parsed.courseSlug,
        courseName: parsed.courseName,
        source: 'coursera-webhook',
      });

      await recordXapiEvent({
        statementId: parsed.statementId,
        identity,
        courseSlug: parsed.courseSlug,
        courseName: parsed.courseName,
        verbId: parsed.verbId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        completionStatus: 'completed',
        rawPayload: parsed.rawStatement,
      });

      completions.push({
        email: parsed.email,
        actorIdentifier: parsed.actorIdentifier,
        statementId: parsed.statementId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process statement';

      await recordXapiEvent({
        statementId: parsed.statementId,
        identity,
        courseSlug: parsed.courseSlug,
        courseName: parsed.courseName,
        verbId: parsed.verbId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        completionStatus: 'error',
        error: message,
        rawPayload: parsed.rawStatement,
      });

      completions.push({
        email: parsed.email,
        actorIdentifier: parsed.actorIdentifier,
        statementId: parsed.statementId,
        matchedUserId: resolvedUser.userId,
        mappingMethod: resolvedUser.mappingMethod,
        ok: false,
        error: message,
      });
    }

    await markXapiStatementProcessed(parsed.statementId);
  }

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

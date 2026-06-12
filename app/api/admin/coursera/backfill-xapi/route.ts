import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { parseXapiStatement, isXapiCompletionVerb, isXapiCourseProgressVerb } from '@/lib/xapi/statementModel';
import { upsertCourseProgressFromXapiStatement } from '@/lib/member/courseProgress';

import { withApiGuc } from '@/lib/db/withRequestGuc';

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return null;
  }
  return user;
}async function _GET(request: Request) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  
    const url = new URL(request.url);
    const email = url.searchParams.get('email')?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: 'email query param required' }, { status: 400 });
    }
  
    return runBackfill(email);
  } catch (error) {
    console.error('/admin/coursera/backfill-xapi:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: Request) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  
    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }
  
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 });
    }
  
    return runBackfill(email);
  } catch (error) {
    console.error('/admin/coursera/backfill-xapi:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

async function runBackfill(email: string) {  const member = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { email: { mode: 'insensitive', equals: email } },
    select: { id: true, email: true, fullName: true, enrolledProgram: true },
  }));
  if (!member) {
    return NextResponse.json({ ok: false, error: 'Member not found' }, { status: 404 });
  }
  if (!member.enrolledProgram) {
    return NextResponse.json({ ok: false, error: 'Member has no enrolled program' }, { status: 400 });
  }

  const statements = await prisma.$transaction((tx) => tx.xapiStatement.findMany({
    where: { actorEmail: email },
    orderBy: { createdAt: 'asc' },
    take: 100,
  }));

  if (statements.length === 0) {
    return NextResponse.json({ ok: false, error: 'No xAPI statements found' }, { status: 404 });
  }

  const results: Array<{
    statementId: string | null;
    verb: string;
    courseSlug: string | null;
    matched: boolean;
    status: string;
    error?: string;
  }> = [];

  for (const stmt of statements) {
    const parsed = parseXapiStatement({
      id: stmt.statementId,
      actor: {
        mbox: stmt.actorEmail ? `mailto:${stmt.actorEmail}` : '',
      },
      verb: { id: stmt.verb },
      object: {
        id: stmt.courseId ?? undefined,
        definition: stmt.courseName ? { name: stmt.courseName } : undefined,
      },
      result: {
        score: stmt.resultScoreScaled != null || stmt.resultScoreRaw != null
          ? { scaled: stmt.resultScoreScaled ?? undefined, raw: stmt.resultScoreRaw ?? undefined }
          : undefined,
        completion: stmt.resultCompletion ?? undefined,
        success: stmt.resultSuccess ?? undefined,
      },
    } as Record<string, unknown>);

    if (!parsed) {
      results.push({
        statementId: stmt.statementId,
        verb: stmt.verb,
        courseSlug: null,
        matched: false,
        status: 'parse_failed',
        error: 'Could not parse xAPI statement',
      });
      continue;
    }

    if (!isXapiCourseProgressVerb(parsed)) {
      results.push({
        statementId: stmt.statementId,
        verb: stmt.verb,
        courseSlug: parsed.courseSlug ?? null,
        matched: false,
        status: 'not_progress_verb',
      });
      continue;
    }

    try {
      await upsertCourseProgressFromXapiStatement({
        userId: member.id,
        enrolledProgramSlug: member.enrolledProgram,
        parsed,
      });
      results.push({
        statementId: stmt.statementId,
        verb: stmt.verb,
        courseSlug: parsed.courseSlug ?? null,
        matched: true,
        status: isXapiCompletionVerb(parsed) ? 'completed' : 'progress_updated',
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      results.push({
        statementId: stmt.statementId,
        verb: stmt.verb,
        courseSlug: parsed.courseSlug ?? null,
        matched: false,
        status: 'error',
        error,
      });
    }
  }

  const progressUpdated = results.filter((r) => r.status === 'progress_updated').length;
  const completed = results.filter((r) => r.status === 'completed').length;
  const failed = results.filter((r) => r.status === 'error' || r.status === 'parse_failed').length;

  return NextResponse.json({
    ok: true,
    member: { id: member.id, email: member.email, fullName: member.fullName, program: member.enrolledProgram },
    totalStatements: statements.length,
    progressUpdated,
    completed,
    failed,
    results,
  });
}
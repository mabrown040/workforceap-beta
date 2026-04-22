import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { completeMemberCourse } from '@/lib/member/courseCompletion';
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
    const member = await prisma.user.findUnique({
      where: { email: statement.email },
      select: { id: true, email: true },
    });

    if (!member) {
      completions.push({
        email: statement.email,
        statementId: statement.statementId,
        ok: false,
        error: 'Member not found',
      });
      continue;
    }

    try {
      const result = await completeMemberCourse({
        userId: member.id,
        courseSlug: statement.courseSlug,
        courseName: statement.courseName,
        source: 'coursera-webhook',
      });

      completions.push({
        email: statement.email,
        statementId: statement.statementId,
        ...result,
      });
    } catch (error) {
      completions.push({
        email: statement.email,
        statementId: statement.statementId,
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to process statement',
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

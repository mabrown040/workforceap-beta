import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendMatchActionEmail } from '@/lib/email';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { getMatchSuggestionsTestRecipient, isMatchSuggestionsDryRun } from '@/lib/admin/matchSuggestionsConfig';
import { applyEmployerNotifiedAfterSuggest } from '@/lib/admin/applyEmployerNotifiedAfterSuggest';

async function recordSuggestAudit(input: {
  actorUserId: string;
  jobId: string;
  summary: string;
  status: 'started' | 'success' | 'fallback' | 'error' | 'inspection';
  httpStatus: number;
  metadata: Record<string, unknown>;
}) {
  try {
    await recordWorkflowDiagnostic({
      workflow: 'admin_match_suggestions',
      actorUserId: input.actorUserId,
      entityType: 'job',
      entityId: input.jobId,
      status: input.status,
      summary: input.summary,
      method: 'email',
      metadata: {
        ...input.metadata,
        httpStatus: input.httpStatus,
        actorUserId: input.actorUserId,
        jobId: input.jobId,
        at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[admin_match_suggestions] recordSuggestAudit failed', {
      jobId: input.jobId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function safeUpdateJobMatchSuggestionFields(
  jobId: string,
  context: string,
  data: {
    matchSuggestionsLastSentAt: Date;
    matchSuggestionsLastStatus: string;
    matchSuggestionsLastError: string | null;
  }
) {
  try {
    await prisma.job.update({ where: { id: jobId }, data });
  } catch (err) {
    console.error('[admin_match_suggestions] matchSuggestions job fields update failed', {
      jobId,
      context,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      employer: { select: { contactEmail: true, companyName: true } },
      aiMatches: {
        where: { status: 'suggested' },
        include: {
          student: { select: { id: true, fullName: true, enrolledProgram: true } },
        },
        orderBy: { matchScore: 'desc' },
        take: 5,
      },
    },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.aiMatches.length === 0) {
    await recordSuggestAudit({
      actorUserId: user.id,
      jobId: id,
      summary: 'Attempted to send match suggestions with zero suggested matches',
      status: 'fallback',
      httpStatus: 400,
      metadata: { outcome: 'no_suggested_matches', matchCount: 0 },
    });
    return NextResponse.json({ error: 'No matches to suggest. Run AI matching first.' }, { status: 400 });
  }

  const intendedRecipient = job.employer.contactEmail;
  const testRecipient = getMatchSuggestionsTestRecipient();
  const actualRecipient = testRecipient ?? intendedRecipient;
  const testMode = Boolean(testRecipient);
  const dryRun = isMatchSuggestionsDryRun();
  const now = new Date();
  const matchCount = job.aiMatches.length;

  const emailPayload = {
    to: actualRecipient,
    jobTitle: job.title,
    companyName: job.employer.companyName,
    matches: job.aiMatches.map((m) => ({
      name: m.student.fullName,
      program: m.student.enrolledProgram ?? '—',
      score: m.matchScore,
    })),
  };

  if (dryRun) {
    await safeUpdateJobMatchSuggestionFields(id, 'dry_run', {
      matchSuggestionsLastSentAt: now,
      matchSuggestionsLastStatus: 'dry_run',
      matchSuggestionsLastError: null,
    });
    await recordSuggestAudit({
      actorUserId: user.id,
      jobId: id,
      summary: `Dry run — skipped Resend (${matchCount} match row(s))`,
      status: 'success',
      httpStatus: 200,
      metadata: {
        outcome: 'dry_run',
        dryRun: true,
        testMode,
        intendedRecipient,
        actualRecipient,
        matchCount,
      },
    });
    return NextResponse.json({ ok: true, dryRun: true, count: matchCount, testMode });
  }

  const sent = await sendMatchActionEmail(emailPayload);
  if (!sent.ok) {
    await safeUpdateJobMatchSuggestionFields(id, 'send_failed', {
      matchSuggestionsLastSentAt: now,
      matchSuggestionsLastStatus: 'failed',
      matchSuggestionsLastError: sent.error ?? 'send failed',
    });
    await recordSuggestAudit({
      actorUserId: user.id,
      jobId: id,
      summary: `Match suggestion email failed: ${sent.error ?? 'unknown'}`,
      status: 'error',
      httpStatus: 502,
      metadata: {
        outcome: 'send_failed',
        error: sent.error ?? null,
        intendedRecipient,
        actualRecipient,
        testMode,
        matchCount,
      },
    });
    return NextResponse.json({ error: sent.error ?? 'Failed to send employer email' }, { status: 502 });
  }

  const lastStatus = testMode ? 'test_sent' : 'success';
  await safeUpdateJobMatchSuggestionFields(id, 'after_email_sent', {
    matchSuggestionsLastSentAt: now,
    matchSuggestionsLastStatus: lastStatus,
    matchSuggestionsLastError: null,
  });

  const studentIds = job.aiMatches.map((m) => m.studentId);
  const notifyResult = await applyEmployerNotifiedAfterSuggest(
    () =>
      prisma.aIJobMatch.updateMany({
        where: { jobId: id, studentId: { in: studentIds } },
        data: { status: 'employer_notified' },
      }),
    (msg, ctx) => console.error(msg, ctx),
    id
  );

  await recordSuggestAudit({
    actorUserId: user.id,
    jobId: id,
    summary:
      notifyResult === 'ok'
        ? `Sent ${matchCount} AI match suggestion(s)${testMode ? ' (test inbox)' : ''}`
        : `Email delivered but employer_notified DB update failed (${notifyResult})`,
    status: notifyResult === 'ok' ? 'success' : 'fallback',
    httpStatus: 200,
    metadata: {
      outcome: notifyResult === 'ok' ? 'sent' : 'sent_db_notify_failed',
      intendedRecipient,
      actualRecipient,
      testMode,
      dryRun: false,
      matchCount,
      notifyResult,
    },
  });

  return NextResponse.json({
    ok: true,
    count: matchCount,
    testMode,
    employerNotifiedUpdate: notifyResult,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendMatchActionEmail } from '@/lib/email';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';

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
    try {
      await recordWorkflowDiagnostic({
        workflow: 'admin_match_suggestions',
        status: 'fallback',
        actorUserId: user.id,
        entityType: 'job',
        entityId: id,
        summary: 'Attempted to send match suggestions with zero suggested matches',
        method: 'email',
        fallbackPath: 'no_suggested_matches',
      });
    } catch (err) {
      console.error('[admin_match_suggestions] recordWorkflowDiagnostic failed', {
        jobId: id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return NextResponse.json({ error: 'No matches to suggest. Run AI matching first.' }, { status: 400 });
  }

  const sent = await sendMatchActionEmail({
    to: job.employer.contactEmail,
    jobTitle: job.title,
    companyName: job.employer.companyName,
    matches: job.aiMatches.map((m) => ({
      name: m.student.fullName,
      program: m.student.enrolledProgram ?? '—',
      score: m.matchScore,
    })),
  });
  if (!sent.ok) {
    console.error('[admin_match_suggestions] sendMatchActionEmail failed', { jobId: id, error: sent.error });
    return NextResponse.json({ error: sent.error ?? 'Failed to send employer email' }, { status: 502 });
  }

  try {
    await prisma.aIJobMatch.updateMany({
      where: { jobId: id, studentId: { in: job.aiMatches.map((m) => m.studentId) } },
      data: { status: 'employer_notified' },
    });
  } catch (err) {
    console.error('[admin_match_suggestions] updateMany failed after email sent', {
      jobId: id,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    await recordWorkflowDiagnostic({
      workflow: 'admin_match_suggestions',
      status: 'success',
      actorUserId: user.id,
      entityType: 'job',
      entityId: id,
      summary: `Sent ${job.aiMatches.length} AI match suggestion(s) to employer`,
      provider: 'email',
      method: 'email',
      metadata: { count: job.aiMatches.length },
    });
  } catch (err) {
    console.error('[admin_match_suggestions] recordWorkflowDiagnostic failed', {
      jobId: id,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true, count: job.aiMatches.length });
}

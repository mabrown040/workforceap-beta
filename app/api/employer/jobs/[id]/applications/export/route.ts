import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

type ApplicantExportRow = {
  fullName: string;
  email: string;
  status: string;
  appliedAt: Date;
  resumeUrl: string | null;
  matchScore: number | null;
};

/**
 * GET /api/employer/jobs/[id]/applications/export
 * Streams a CSV of applicants for a single job posting. Auth + job-ownership
 * checks mirror /api/employer/jobs/[id]/applicants. Also includes the resume
 * URL the applicant submitted for this job and, where present, the AI job
 * match score for (this job, this applicant) — both scoped to data the
 * employer already owns via the job, so this is not a new data-exposure
 * surface even though the applicants list endpoint doesn't return them today.
 */
async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getEmployerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const job = await prisma.$transaction((tx) => tx.job.findFirst({
      where: { id, employerId: ctx.employerId },
      select: { id: true, title: true },
    }));
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const applications = await prisma.$transaction((tx) => tx.jobPostingApplication.findMany({
      where: { jobId: id },
      orderBy: { appliedAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
      },
      take: 200,
    }));

    // One batched lookup for all AI match scores on this job, joined in memory
    // below — avoids an N+1 query per applicant row.
    const matches = await prisma.$transaction((tx) => tx.aIJobMatch.findMany({
      where: { jobId: id, studentId: { in: applications.map((app) => app.studentId) } },
      select: { studentId: true, matchScore: true },
    }));
    const matchScoreByStudentId = new Map(matches.map((m) => [m.studentId, m.matchScore]));

    const rows: ApplicantExportRow[] = applications.map((app) => ({
      fullName: app.student.fullName,
      email: app.student.email,
      status: app.status,
      appliedAt: app.appliedAt,
      resumeUrl: app.resumeUrl,
      matchScore: matchScoreByStudentId.get(app.studentId) ?? null,
    }));

    const csv = dataToCsv(
      [
        { key: 'fullName', header: 'Applicant Name', accessor: (r) => r.fullName },
        { key: 'email', header: 'Email', accessor: (r) => r.email },
        { key: 'status', header: 'Status', accessor: (r) => r.status },
        { key: 'appliedAt', header: 'Applied Date', accessor: (r) => r.appliedAt },
        { key: 'resumeUrl', header: 'Resume URL', accessor: (r) => r.resumeUrl },
        { key: 'matchScore', header: 'AI Match Score', accessor: (r) => r.matchScore },
      ],
      rows,
      { reportTitle: `Applicants — ${job.title}` },
    );

    auditLog({
      actorUserId: user.id,
      action: 'employer_applicants_exported',
      targetType: 'Job',
      targetId: job.id,
      metadata: { employerId: ctx.employerId, rowCount: rows.length },
    }).catch(() => {});
    logAuditEvent({
      user: { id: user.id, role: 'employer' },
      verb: 'exported',
      object: { type: 'JobApplicantsExport', id: job.id },
      result: { success: true, extensions: { rowCount: rows.length } },
    }).catch(() => {});

    return csvDownloadResponse(csv, exportFilename(`applicants-${job.id}`));
  } catch (error) {
    console.error('/employer/jobs/[id]/applications/export GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);

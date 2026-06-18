import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const updateSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected']),
});async function _GET(
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

    return NextResponse.json({
      job: { id: job.id, title: job.title },
      applicants: applications.map((app) => ({
        id: app.id,
        status: app.status,
        appliedAt: app.appliedAt.toISOString(),
        employerNotes: app.employerNotes ?? null,
        student: app.student,
      })),
    });
  } catch (error) {
    console.error('/employer/jobs/[id]/applicants GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _PATCH(
  request: NextRequest,
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
      select: { id: true },
    }));
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicantId');
    if (!applicantId) {
      return NextResponse.json({ error: 'Missing applicantId query parameter' }, { status: 400 });
    }

    const application = await prisma.$transaction((tx) => tx.jobPostingApplication.findFirst({
      where: { id: applicantId, jobId: id },
      select: { id: true },
    }));
    if (!application) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });

    const updated = await prisma.$transaction((tx) => tx.jobPostingApplication.update({
      where: { id: applicantId },
      data: { status: parsed.data.status, statusUpdatedAt: new Date() },
    }));

    auditLog({
      actorUserId: user.id,
      action: 'employer_applicant_status_updated',
      targetType: 'User',
      targetId: updated.studentId,
      metadata: { applicationId: applicantId, jobId: id, nextStatus: updated.status, employerId: ctx.employerId },
    }).catch(() => {});
    logAuditEvent({
      user: { id: user.id, role: 'employer' },
      verb: 'updated',
      object: { type: 'JobApplication', id: applicantId },
      result: { success: true, extensions: { jobId: id, nextStatus: updated.status } },
    }).catch(() => {});

    return NextResponse.json({ ok: true, application: updated });
  } catch (error) {
    console.error('/employer/jobs/[id]/applicants PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

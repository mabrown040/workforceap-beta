import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendJobSubmittedEmail } from '@/lib/email';
import { z } from 'zod';
import { trackEvent } from '@/lib/events/track';
import { recordEmployerWorkflowEvent } from '@/lib/portal/workflowEvents';
import { invalidateJobListings } from '@/lib/jobs/listingCache';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const jobUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
  locationType: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  jobType: z.enum(['fulltime', 'parttime', 'contract']).optional(),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  description: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional().nullable(),
  importProvider: z.string().max(100).optional().nullable(),
  importMethod: z.string().max(100).optional().nullable(),
  requirements: z.array(z.string()).optional(),
  preferredCertifications: z.array(z.string()).optional(),
  suggestedPrograms: z.array(z.string()).optional(),
  status: z.enum(['draft', 'pending', 'approved', 'live', 'filled', 'closed']).optional(),
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
  const job = await prisma.job.findFirst({
    where: { id, employerId: ctx.employerId },
    include: {
      applications: {
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json(job);

  } catch (error) {
    console.error('/employer/jobs/[id] error:', error);
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
  const existing = await prisma.job.findFirst({
    where: { id, employerId: ctx.employerId },
  });
  if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = jobUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  // Pending approval employers can only save drafts
  if (ctx.employer.status === 'pending_approval' && parsed.data.status && parsed.data.status !== 'draft') {
    return NextResponse.json(
      { error: 'Your account is pending approval. You can only save drafts at this time.' },
      { status: 403 }
    );
  }

  const data = parsed.data as Record<string, unknown>;
  const status = data.status as string | undefined;
  if (status === 'pending' && existing.status === 'draft') {
    data.status = 'pending';
  }
  if (status === 'filled' || status === 'closed') {
    if (existing.status !== 'live' && existing.status !== 'approved') {
      return NextResponse.json({ error: 'Only active or paused jobs can be closed' }, { status: 400 });
    }
  }

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...(parsed.data.title && { title: parsed.data.title }),
      ...(parsed.data.location !== undefined && { location: parsed.data.location }),
      ...(parsed.data.locationType && { locationType: parsed.data.locationType }),
      ...(parsed.data.jobType && { jobType: parsed.data.jobType }),
      ...(parsed.data.salaryMin !== undefined && { salaryMin: parsed.data.salaryMin }),
      ...(parsed.data.salaryMax !== undefined && { salaryMax: parsed.data.salaryMax }),
      ...(parsed.data.description && { description: parsed.data.description }),
      ...(parsed.data.sourceUrl !== undefined && { sourceUrl: parsed.data.sourceUrl }),
      ...(parsed.data.importProvider !== undefined && { importProvider: parsed.data.importProvider }),
      ...(parsed.data.importMethod !== undefined && { importMethod: parsed.data.importMethod }),
      ...(parsed.data.requirements && { requirements: parsed.data.requirements }),
      ...(parsed.data.preferredCertifications && { preferredCertifications: parsed.data.preferredCertifications }),
      ...(parsed.data.suggestedPrograms && { suggestedPrograms: parsed.data.suggestedPrograms }),
      ...(parsed.data.status && { status: parsed.data.status }),
    },
  });

  // Notify admin when job is submitted for review (draft/closed → pending)
  if (parsed.data.status === 'pending' && (existing.status === 'draft' || existing.status === 'closed')) {
    const employer = await prisma.employer.findUnique({
      where: { id: ctx.employerId },
      select: { companyName: true, contactEmail: true },
    });
    if (employer) {
      await sendJobSubmittedEmail({
        jobTitle: job.title,
        companyName: employer.companyName,
        employerEmail: employer.contactEmail,
        jobId: job.id,
      });
    }
  }

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await recordEmployerWorkflowEvent({
      employerId: ctx.employerId,
      actorUserId: user.id,
      kind: 'job_status',
      headline: `Job status → ${job.status}: ${job.title}`,
      entityType: 'Job',
      entityId: job.id,
    });
  }

  // Invalidate public job listings cache when a live job is modified
  if (existing.status === 'live' || job.status === 'live') {
    await invalidateJobListings().catch(() => {});
  }

  if (parsed.data.status === 'pending' || parsed.data.status === 'draft' || parsed.data.status === undefined) {
    await trackEvent({
      userId: user.id,
      eventName: parsed.data.status === 'pending' ? 'employer_job_submitted_for_review' : 'employer_job_draft_saved',
      entityType: 'job',
      entityId: job.id,
      metadata: { isCreate: false, previousStatus: existing.status, nextStatus: job.status },
      sourcePage: `/employer/jobs/${id}`,
    });
  }

  return NextResponse.json(job);

  } catch (error) {
    console.error('/employer/jobs/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getEmployerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.job.findFirst({
      where: { id, employerId: ctx.employerId },
    });
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const job = await prisma.job.update({
      where: { id },
      data: { status: 'closed' },
    });

    await recordEmployerWorkflowEvent({
      employerId: ctx.employerId,
      actorUserId: user.id,
      kind: 'job_status',
      headline: `Job closed: ${job.title}`,
      entityType: 'Job',
      entityId: job.id,
    });

    // Invalidate public job listings cache when a live job is closed
    if (existing.status === 'live') {
      await invalidateJobListings().catch(() => {});
    }

    return NextResponse.json({ ok: true, job });
  } catch (error) {
    console.error('/employer/jobs/[id] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);


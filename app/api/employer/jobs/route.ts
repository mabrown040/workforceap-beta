import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { sendJobSubmittedEmail } from '@/lib/email';
import { buildEmployerJobCreateData, getRouteErrorDetails } from '@/lib/employer/jobCreate';
import { z } from 'zod';
import { captureApiError } from '@/lib/observability/captureApiError';
import { trackEvent } from '@/lib/events/track';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { invalidateJobListings } from '@/lib/jobs/listingCache';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const jobCreateSchema = z.object({
  title: z.string().min(1).max(200),
  companyName: z.string().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
  locationType: z.enum(['remote', 'hybrid', 'onsite']).default('onsite'),
  jobType: z.enum(['fulltime', 'parttime', 'contract']).default('fulltime'),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  description: z.string().min(1),
  sourceUrl: z.string().url().optional().nullable(),
  importProvider: z.string().max(100).optional().nullable(),
  importMethod: z.string().max(100).optional().nullable(),
  requirements: z.array(z.string()).default([]),
  preferredCertifications: z.array(z.string()).default([]),
  suggestedPrograms: z.array(z.string()).default([]),
  status: z.enum(['draft', 'pending', 'live']).default('draft'),
  expiresAt: z.string().datetime().optional().nullable(),
});async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const ctx = await getEmployerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });
  
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const locationType = searchParams.get('locationType');
  
    const where: Prisma.JobWhereInput = { employerId: ctx.employerId };
    switch (filter) {
      case 'pending':
        where.status = { in: ['pending'] };
        break;
      case 'live':
        where.status = { in: ['live'] };
        break;
      case 'filled':
        where.status = { in: ['filled', 'closed'] };
        break;
      case 'draft':
        where.status = { in: ['draft'] };
        break;
    }
    if (locationType && ['remote', 'hybrid', 'onsite'].includes(locationType)) {
      where.locationType = locationType as 'remote' | 'hybrid' | 'onsite';
    }
  
    const employerScope = await prisma.$transaction((tx) => tx.employer.findUnique({
      where: { id: ctx.employerId },
      select: { organizationId: true },
    }));
    if (!employerScope) {
      return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });
    }
  
    const jobs = await withTenantScope(employerScope.organizationId, (db) =>
      db.job.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          applications: { select: { id: true } },
        },
        take: 100,
      }),
    );
  
    const items = jobs.map(({ applications, ...job }) => ({
      ...job,
      applicationsCount: applications.length,
    }));
  
    return NextResponse.json(items);
  } catch (error) {
    console.error('/employer/jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getEmployerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });

    const body = await request.json().catch(() => null);
    const parsed = jobCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }

    // Pending approval employers can only save drafts
    if (ctx.employer.status === 'pending_approval' && parsed.data.status !== 'draft') {
      return NextResponse.json(
        { error: 'Your account is pending approval. You can only save drafts at this time.' },
        { status: 403 }
      );
    }

  const employer = await prisma.$transaction((tx) => tx.employer.findUnique({
      where: { id: ctx.employerId },
      select: { companyName: true, contactEmail: true, organizationId: true },
    }));
    if (!employer) {
      return NextResponse.json({ error: 'Selected employer record was not found.' }, { status: 400 });
    }

    const job = await prisma.$transaction((tx) => tx.job.create({
      data: buildEmployerJobCreateData(employer.organizationId, ctx.employerId, parsed.data),
    }));

    if (parsed.data.status === 'pending') {
      await sendJobSubmittedEmail({
        jobTitle: job.title,
        companyName: employer.companyName,
        employerEmail: employer.contactEmail,
        jobId: job.id,
      });
    }

    const eventName =
      parsed.data.status === 'pending'
        ? 'employer_job_submitted_for_review'
        : parsed.data.status === 'live'
          ? 'employer_job_posted_live'
          : 'employer_job_draft_saved';
    const sourcePage =
      parsed.data.status === 'pending'
        ? '/employer/jobs/new?submit=review'
        : parsed.data.status === 'live'
          ? '/employer/jobs/post'
          : '/employer/jobs/new';

    await trackEvent({
      userId: user.id,
      eventName,
      entityType: 'job',
      entityId: job.id,
      metadata: { isCreate: true, status: parsed.data.status },
      sourcePage,
    });

    // Invalidate public job listings cache when a job is posted live
    if (parsed.data.status === 'live') {
      await invalidateJobListings().catch(() => {});
    }

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    const detail = getRouteErrorDetails(error);
    captureApiError(error, { route: 'employer/jobs POST', extra: detail });
    return NextResponse.json(
      { error: 'Failed to create job draft.', detail: detail.message, code: detail.code },
      { status: 500 }
    );
  }
}
export const POST = withApiGuc(_POST);

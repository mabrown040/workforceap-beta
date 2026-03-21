import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { sendJobSubmittedEmail } from '@/lib/email';
import { buildEmployerJobCreateData, getRouteErrorDetails } from '@/lib/employer/jobCreate';
import { z } from 'zod';

const jobCreateSchema = z.object({
  title: z.string().min(1).max(200),
  companyName: z.string().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
  locationType: z.enum(['remote', 'hybrid', 'onsite']).default('onsite'),
  jobType: z.enum(['fulltime', 'parttime', 'contract']).default('fulltime'),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  description: z.string().min(1),
  requirements: z.array(z.string()).default([]),
  preferredCertifications: z.array(z.string()).default([]),
  suggestedPrograms: z.array(z.string()).default([]),
  status: z.enum(['draft', 'pending']).default('draft'),
});

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';

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

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      applications: { select: { id: true } },
    },
  });

  const items = jobs.map(({ applications, ...job }) => ({
    ...job,
    applicationsCount: applications.length,
  }));

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
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

    const employer = await prisma.employer.findUnique({
      where: { id: ctx.employerId },
      select: { companyName: true, contactEmail: true },
    });
    if (!employer) {
      return NextResponse.json({ error: 'Selected employer record was not found.' }, { status: 400 });
    }

    const job = await prisma.job.create({
      data: buildEmployerJobCreateData(ctx.employerId, parsed.data),
    });

    if (parsed.data.status === 'pending') {
      await sendJobSubmittedEmail({
        jobTitle: job.title,
        companyName: employer.companyName,
        employerEmail: employer.contactEmail,
        jobId: job.id,
      });
    }

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    const detail = getRouteErrorDetails(error);
    console.error('Employer job create failed', detail);
    return NextResponse.json(
      { error: 'Failed to create job draft.', detail: detail.message, code: detail.code },
      { status: 500 }
    );
  }
}

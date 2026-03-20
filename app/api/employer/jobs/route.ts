import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendJobSubmittedEmail } from '@/lib/email';
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

  const where: { employerId: string; status?: object } = { employerId: ctx.employerId };
  if (filter !== 'all') {
    where.status = filter === 'pending' ? { in: ['pending'] } :
      filter === 'live' ? { in: ['live'] } :
      filter === 'filled' ? { in: ['filled', 'closed'] } :
      filter === 'draft' ? { in: ['draft'] } : {};
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { applications: true } },
    },
  });

  const items = jobs.map((j) => ({
    ...j,
    applicationsCount: j._count.applications,
  }));

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
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
    select: { companyName: true },
  });

  const job = await prisma.job.create({
    data: {
      employerId: ctx.employerId,
      title: parsed.data.title,
      location: parsed.data.location ?? undefined,
      locationType: parsed.data.locationType,
      jobType: parsed.data.jobType,
      salaryMin: parsed.data.salaryMin ?? undefined,
      salaryMax: parsed.data.salaryMax ?? undefined,
      description: parsed.data.description,
      requirements: parsed.data.requirements,
      preferredCertifications: parsed.data.preferredCertifications,
      suggestedPrograms: parsed.data.suggestedPrograms,
      status: parsed.data.status,
    },
  });

  if (parsed.data.status === 'pending') {
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

  return NextResponse.json(job, { status: 201 });
}

import type { Prisma } from '@prisma/client';
import type { JobPostingApplicationStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const STATUSES: JobPostingApplicationStatus[] = [
  'pending',
  'reviewing',
  'interview',
  'offered',
  'hired',
  'rejected',
];

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const status = searchParams.get('status');
  const q = searchParams.get('q')?.trim();

  const where: Prisma.JobPostingApplicationWhereInput = {
    job: { employerId: ctx.employerId },
  };
  if (jobId) where.jobId = jobId;
  if (status && STATUSES.includes(status as JobPostingApplicationStatus)) {
    where.status = status as JobPostingApplicationStatus;
  }
  if (q) {
    where.OR = [
      { student: { fullName: { contains: q, mode: 'insensitive' } } },
      { student: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  try {
    const applications = await prisma.jobPostingApplication.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        job: { select: { id: true, title: true } },
        student: { select: { id: true, fullName: true, email: true } },
      },
    });
    return NextResponse.json(applications);
  } catch (err) {
    console.error('[employer/applications] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  const where: { job: { employerId: string }; jobId?: string } = {
    job: { employerId: ctx.employerId },
  };
  if (jobId) where.jobId = jobId;

  const applications = await prisma.jobPostingApplication.findMany({
    where,
    orderBy: { appliedAt: 'desc' },
    include: {
      job: { select: { id: true, title: true } },
      student: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json(applications);
}

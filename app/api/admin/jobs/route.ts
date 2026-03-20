import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';

  const where: { status?: object } = {};
  if (filter === 'pending') where.status = { in: ['pending'] };
  else if (filter === 'live') where.status = { in: ['live'] };
  else if (filter === 'filled') where.status = { in: ['filled', 'closed'] };
  else if (filter === 'draft') where.status = { in: ['draft'] };
  else if (filter === 'approved') where.status = { in: ['approved'] };

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      employer: { select: { id: true, companyName: true, contactEmail: true } },
      _count: { select: { applications: true } },
    },
  });

  const items = jobs.map((j) => ({
    ...j,
    applicationsCount: j._count.applications,
  }));

  return NextResponse.json(items);
}

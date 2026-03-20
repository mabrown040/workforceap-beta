import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

/** Public jobs listing - only live jobs for students */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('q')?.trim() || undefined;
  const locationType = searchParams.get('locationType') || undefined;
  const jobType = searchParams.get('jobType') || undefined;
  const program = searchParams.get('program') || undefined;
  const salaryMinParam = searchParams.get('salaryMin');
  const salaryMaxParam = searchParams.get('salaryMax');
  const sort = searchParams.get('sort') || 'newest';

  const andConditions: Prisma.JobWhereInput[] = [];

  if (locationType && ['remote', 'hybrid', 'onsite'].includes(locationType)) {
    andConditions.push({ locationType: locationType as 'remote' | 'hybrid' | 'onsite' });
  }

  if (jobType && ['fulltime', 'parttime', 'contract'].includes(jobType)) {
    andConditions.push({ jobType: jobType as 'fulltime' | 'parttime' | 'contract' });
  }

  if (program) {
    andConditions.push({ suggestedPrograms: { has: program } });
  }

  const salaryMinNum = salaryMinParam ? parseInt(salaryMinParam, 10) : undefined;
  const salaryMaxNum = salaryMaxParam ? parseInt(salaryMaxParam, 10) : undefined;
  if (salaryMinNum !== undefined && !Number.isNaN(salaryMinNum)) {
    // Job range overlaps [salaryMin, ∞]: job.salaryMax >= salaryMin OR (no max and job.salaryMin >= salaryMin)
    andConditions.push({
      OR: [
        { salaryMax: { gte: salaryMinNum } },
        { salaryMax: null, salaryMin: { gte: salaryMinNum } },
      ],
    });
  }
  if (salaryMaxNum !== undefined && !Number.isNaN(salaryMaxNum)) {
    // Job range overlaps (-∞, salaryMax]: job.salaryMin <= salaryMax OR (no min and job.salaryMax <= salaryMax)
    andConditions.push({
      OR: [
        { salaryMin: { lte: salaryMaxNum } },
        { salaryMin: null, salaryMax: { lte: salaryMaxNum } },
      ],
    });
  }

  if (keyword) {
    const k = keyword.toLowerCase();
    andConditions.push({
      OR: [
        { title: { contains: k, mode: 'insensitive' } },
        { description: { contains: k, mode: 'insensitive' } },
        { employer: { companyName: { contains: k, mode: 'insensitive' } } },
      ],
    });
  }

  const where: Prisma.JobWhereInput = {
    status: 'live',
    ...(andConditions.length > 0 && { AND: andConditions }),
  };

  const orderBy: Prisma.JobOrderByWithRelationInput[] =
    sort === 'salary-desc'
      ? [{ salaryMax: 'desc' }, { salaryMin: 'desc' }]
      : sort === 'salary-asc'
        ? [{ salaryMin: 'asc' }, { salaryMax: 'asc' }]
        : sort === 'title'
          ? [{ title: 'asc' }]
          : [{ updatedAt: 'desc' }];

  const jobs = await prisma.job.findMany({
    where,
    orderBy,
    include: {
      employer: { select: { companyName: true } },
    },
  });

  return NextResponse.json(jobs);
}

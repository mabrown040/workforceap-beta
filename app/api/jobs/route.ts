import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/** Public jobs listing - only live jobs for students */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationType = searchParams.get('locationType');
  const jobType = searchParams.get('jobType');

  const jobs = await prisma.job.findMany({
    where: {
      status: 'live',
      ...(locationType && ['remote', 'hybrid', 'onsite'].includes(locationType) && {
        locationType: locationType as 'remote' | 'hybrid' | 'onsite',
      }),
      ...(jobType && ['fulltime', 'parttime', 'contract'].includes(jobType) && {
        jobType: jobType as 'fulltime' | 'parttime' | 'contract',
      }),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      employer: { select: { companyName: true, logoUrl: true } },
    },
  });

  return NextResponse.json(jobs);
}

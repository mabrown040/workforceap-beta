import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async (req: NextRequest) => {
  try {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry');
  const take = Math.min(parseInt(searchParams.get('take') ?? '', 10) || 24, 50);
  const skip = Math.max(0, parseInt(searchParams.get('skip') ?? '', 10) || 0);

  const where: Record<string, unknown> = { isActive: true, approvedAt: { not: null } };
  if (industry) where.industry = industry;

  const [mentors, total] = await Promise.all([
    prisma.mentor.findMany({
      where,
      orderBy: { approvedAt: 'desc' },
      take,
      skip,
      select: {
        id: true, fullName: true, title: true, company: true,
        industry: true, bio: true, availableHours: true,
        linkedinUrl: true,
      },
    }),
    prisma.mentor.count({ where }),
  ]);

  return NextResponse.json({ mentors, total });

  } catch (error) {
    console.error('/mentors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


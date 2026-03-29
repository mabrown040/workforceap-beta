import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry');
  const take = Math.min(Number(searchParams.get('take') ?? 24), 50);
  const skip = Number(searchParams.get('skip') ?? 0);

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
}

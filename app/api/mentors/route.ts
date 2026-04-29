import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkPublicCareersGetRateLimit } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function GET(request: NextRequest) {
  // Rate limiting to prevent data scraping
  const ip = getClientIp(request);
  const { success: rateOk } = await checkPublicCareersGetRateLimit(ip);
  if (!rateOk) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
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

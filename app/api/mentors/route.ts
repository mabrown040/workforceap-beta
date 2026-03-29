import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const industry = searchParams.get('industry') || '';
    const specialty = searchParams.get('specialty') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (industry) where.industry = industry;
    if (specialty) {
      where.specialties = { some: { name: { contains: specialty, mode: 'insensitive' } } };
    }

    const [mentors, total] = await Promise.all([
      prisma.mentor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { approvedAt: 'desc' },
        include: {
          specialties: true,
          user: { select: { id: true, fullName: true } },
        },
      }),
      prisma.mentor.count({ where }),
    ]);

    return NextResponse.json({ mentors, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Mentors list error:', err);
    return NextResponse.json({ error: 'Failed to load mentors' }, { status: 500 });
  }
}

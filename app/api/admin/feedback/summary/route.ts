import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async (request: NextRequest) => {
  try {
    const auth = await requireAdminOrCounselor(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;

    const dateFilter =
      from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {};

    const [totalCount, byType, recentTrend] = await Promise.all([
      prisma.memberFeedback.count({ where: dateFilter }),
      prisma.memberFeedback.groupBy({
        by: ['type'],
        where: dateFilter,
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.memberFeedback.findMany({
        where: dateFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { fullName: true } },
        },
      }),
    ]);

    const summary = byType.map((row) => ({
      type: row.type,
      averageRating: row._avg.rating ? Number(row._avg.rating.toFixed(2)) : 0,
      count: row._count.rating,
    }));

    return NextResponse.json({
      totalCount,
      summary,
      recentTrend: recentTrend.map((f) => ({
        id: f.id,
        type: f.type,
        rating: f.rating,
        comment: f.comment,
        memberName: f.user.fullName,
        createdAt: f.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('/admin/feedback/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

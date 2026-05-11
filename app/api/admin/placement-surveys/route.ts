import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOrCounselor } from '@/lib/auth/roles';

/**
 * GET /api/admin/placement-surveys
 * Admin API: view all placement survey results.
 * Query params: ?status=completed|pending&limit=50&offset=0
 */
export async function GET(req: Request) {
  const auth = await requireAdminOrCounselor(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  try {
    const where = {
      ...(status === 'completed' ? { completedAt: { not: null } } : {}),
      ...(status === 'pending' ? { completedAt: null } : {}),
    };

    const [surveys, total] = await Promise.all([
      prisma.placementSurvey.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              enrolledProgram: true,
            },
          },
        },
      }),
      prisma.placementSurvey.count({ where }),
    ]);

    // Aggregate stats for completed surveys
    const completedSurveys = surveys.filter((s) => s.completedAt);
    const avgJobSatisfaction = completedSurveys.length > 0
      ? completedSurveys.reduce((sum, s) => sum + (s.jobSatisfaction ?? 0), 0) / completedSurveys.length
      : null;
    const avgTrainingRelevance = completedSurveys.length > 0
      ? completedSurveys.reduce((sum, s) => sum + (s.trainingRelevance ?? 0), 0) / completedSurveys.length
      : null;
    const avgSupportQuality = completedSurveys.length > 0
      ? completedSurveys.reduce((sum, s) => sum + (s.supportQuality ?? 0), 0) / completedSurveys.length
      : null;

    const testimonials = completedSurveys.filter((s) => s.allowTestimonial);

    return NextResponse.json({
      surveys,
      total,
      offset,
      limit,
      stats: {
        completed: completedSurveys.length,
        pending: surveys.filter((s) => !s.completedAt).length,
        avgJobSatisfaction: avgJobSatisfaction ? Math.round(avgJobSatisfaction * 10) / 10 : null,
        avgTrainingRelevance: avgTrainingRelevance ? Math.round(avgTrainingRelevance * 10) / 10 : null,
        avgSupportQuality: avgSupportQuality ? Math.round(avgSupportQuality * 10) / 10 : null,
        testimonialCount: testimonials.length,
      },
    });
  } catch (error) {
    console.error('[admin/placement-surveys] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveys', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

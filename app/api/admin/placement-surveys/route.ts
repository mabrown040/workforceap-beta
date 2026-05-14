import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOrCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';

/**
 * GET /api/admin/placement-surveys
 * Admin/counselor API: view placement survey results scoped to the
 * caller's tenant. Super-admins see the whole platform.
 * Query params: ?status=completed|pending&limit=50&offset=0
 *
 * Without tenant scope, this would expose cross-tenant member emails,
 * job-satisfaction ratings, and salary data.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrCounselor(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Build tenant scope: super-admins see all; everyone else is scoped
    // through the survey's user.organizationId.
    let orgScope: { user: { organizationId: string } } | null = null;
    if (!(await isSuperAdmin(auth.userId))) {
      try {
        const orgId = await getActorOrganizationId(auth.userId);
        orgScope = { user: { organizationId: orgId } };
      } catch {
        return NextResponse.json({ surveys: [], total: 0, limit: 50, offset: 0 });
      }
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    try {
      const where = {
        ...(status === 'completed' ? { completedAt: { not: null } } : {}),
        ...(status === 'pending' ? { completedAt: null } : {}),
        ...(orgScope ?? {}),
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
  
      // Global stats — not page-local
      const [
        globalCompleted,
        globalPending,
        globalTestimonialCount,
        avgJobSatisfactionAgg,
        avgTrainingRelevanceAgg,
        avgSupportQualityAgg,
      ] = await Promise.all([
        prisma.placementSurvey.count({ where: { completedAt: { not: null } } }),
        prisma.placementSurvey.count({ where: { completedAt: null } }),
        prisma.placementSurvey.count({
          where: { completedAt: { not: null }, allowTestimonial: true },
        }),
        prisma.placementSurvey.aggregate({
          where: { completedAt: { not: null } },
          _avg: { jobSatisfaction: true },
        }),
        prisma.placementSurvey.aggregate({
          where: { completedAt: { not: null } },
          _avg: { trainingRelevance: true },
        }),
        prisma.placementSurvey.aggregate({
          where: { completedAt: { not: null } },
          _avg: { supportQuality: true },
        }),
      ]);
  
      return NextResponse.json({
        surveys,
        total,
        offset,
        limit,
        stats: {
          completed: globalCompleted,
          pending: globalPending,
          avgJobSatisfaction: avgJobSatisfactionAgg._avg.jobSatisfaction
            ? Math.round(avgJobSatisfactionAgg._avg.jobSatisfaction * 10) / 10
            : null,
          avgTrainingRelevance: avgTrainingRelevanceAgg._avg.trainingRelevance
            ? Math.round(avgTrainingRelevanceAgg._avg.trainingRelevance * 10) / 10
            : null,
          avgSupportQuality: avgSupportQualityAgg._avg.supportQuality
            ? Math.round(avgSupportQualityAgg._avg.supportQuality * 10) / 10
            : null,
          testimonialCount: globalTestimonialCount,
        },
      });
    } catch (error) {
      console.error('[admin/placement-surveys] Failed:', error);
      return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/placement-surveys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

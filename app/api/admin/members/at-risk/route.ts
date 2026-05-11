import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOrCounselor } from '@/lib/auth/roles';
import { getRiskLevel, THRESHOLDS } from '@/lib/member/atRiskScoring';

/**
 * GET /api/admin/members/at-risk?threshold=50&limit=20
 * Returns at-risk members sorted by score descending.
 * Requires admin or counselor role.
 */
export async function GET(req: Request) {
  const auth = await requireAdminOrCounselor(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const threshold = parseInt(searchParams.get('threshold') ?? String(THRESHOLDS.HIGH), 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const status = searchParams.get('status') ?? undefined;

  try {
    const alerts = await prisma.atRiskAlert.findMany({
      where: {
        score: { gte: threshold },
        ...(status ? { status } : { status: { in: ['open', 'acknowledged'] } }),
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            enrolledProgram: true,
            enrolledAt: true,
            createdAt: true,
            profile: {
              select: {
                employmentStatus: true,
                educationLevel: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    const results = alerts.map((alert) => ({
      alertId: alert.id,
      userId: alert.userId,
      name: alert.user.fullName ?? 'Unknown',
      email: alert.user.email,
      score: alert.score,
      riskLevel: getRiskLevel(alert.score),
      status: alert.status,
      factors: alert.factors as Array<{ name: string; weight: number; description: string }>,
      enrolledProgram: alert.user.enrolledProgram,
      enrolledAt: alert.user.enrolledAt,
      memberSince: alert.user.createdAt,
      profile: alert.user.profile,
      alertCreatedAt: alert.createdAt,
      alertUpdatedAt: alert.updatedAt,
    }));

    return NextResponse.json({
      count: results.length,
      threshold,
      results,
    });
  } catch (error) {
    console.error('[admin/members/at-risk] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch at-risk members', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/members/at-risk/:alertId/acknowledge
 * Acknowledge an at-risk alert.
 */
export async function PATCH(req: Request) {
  const auth = await requireAdminOrCounselor(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { alertId, status } = await req.json();
    if (!alertId || !['acknowledged', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid alertId or status' }, { status: 400 });
    }

    const alert = await prisma.atRiskAlert.update({
      where: { id: alertId },
      data: {
        status,
        ...(status === 'acknowledged'
          ? { acknowledgedAt: new Date(), counselorId: auth.userId }
          : { resolvedAt: new Date() }),
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('[admin/members/at-risk] Patch failed:', error);
    return NextResponse.json(
      { error: 'Failed to update alert', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

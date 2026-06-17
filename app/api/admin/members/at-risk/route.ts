import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOrCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getRiskLevel, THRESHOLDS } from '@/lib/member/atRiskScoring';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET(req: Request) {
  try {
    const auth = await requireAdminOrCounselor(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  
    const superAdmin = await isSuperAdmin(auth.userId);
    const orgId = superAdmin ? null : await getActorOrganizationId(auth.userId).catch(() => null);

    const { searchParams } = new URL(req.url);
    const threshold = parseInt(searchParams.get('threshold') ?? String(THRESHOLDS.HIGH), 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const status = searchParams.get('status') ?? undefined;
  
    try {
      const alerts = await prisma.$transaction((tx) => tx.atRiskAlert.findMany({
        where: {
          score: { gte: threshold },
          ...(status ? { status } : { status: { in: ['open', 'acknowledged', 'escalated'] } }),
          ...(orgId ? { user: { organizationId: orgId } } : {}),
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
              lastCourseraAutoSyncAt: true,
              phone: true,
              profile: {
                select: {
                  employmentStatus: true,
                  educationLevel: true,
                },
              },
            },
          },
        },
      }));
  
      const userIds = [...new Set(alerts.map((a) => a.userId))];
      const activityAgg =
        userIds.length === 0
          ? []
          : await prisma.$transaction((tx) => tx.memberEvent.groupBy({
              by: ['userId'],
              where: { userId: { in: userIds } },
              _max: { createdAt: true },
            }));
      const lastActivityByUser = new Map(activityAgg.map((r) => [r.userId, r._max.createdAt]));
  
      const results = alerts.map((alert) => {
        const ev = lastActivityByUser.get(alert.userId);
        const coursera = alert.user.lastCourseraAutoSyncAt;
        const joined = alert.user.createdAt;
        const lastActivityAt = [ev, coursera, joined].reduce<Date | undefined>((best, d) => {
          if (!d) return best;
          if (!best || d.getTime() > best.getTime()) return d;
          return best;
        }, undefined) ?? joined;
        return {
          alertId: alert.id,
          userId: alert.userId,
          name: alert.user.fullName ?? 'Unknown',
          email: alert.user.email,
          phone: alert.user.phone,
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
          /** Best proxy for “last login”: latest member_activity event, else Coursera sync, else account created. */
          lastActivityAt: lastActivityAt.toISOString(),
        };
      });
  
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
  } catch (error) {
    console.error('/admin/members/at-risk:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _PATCH(req: Request) {
  try {
    const auth = await requireAdminOrCounselor(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  
    const superAdmin = await isSuperAdmin(auth.userId);
    const patchOrgId = superAdmin ? null : await getActorOrganizationId(auth.userId).catch(() => null);

    try {
      const { alertId, status } = await req.json();
      if (!alertId || !['acknowledged', 'resolved', 'escalated'].includes(status)) {
        return NextResponse.json({ error: 'Invalid alertId or status' }, { status: 400 });
      }
  
      const existing = await prisma.atRiskAlert.findFirst({
        where: { id: alertId, ...(patchOrgId ? { user: { organizationId: patchOrgId } } : {}) },
        select: { id: true },
      });
      if (!existing) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });

      const alert = await prisma.$transaction((tx) => tx.atRiskAlert.update({
        where: { id: alertId },
        data: {
          status,
          ...(status === 'acknowledged'
            ? { acknowledgedAt: new Date(), counselorId: auth.userId }
            : status === 'resolved'
              ? { resolvedAt: new Date() }
              : { escalatedAt: new Date(), counselorId: auth.userId }),
        },
      }));
  
      return NextResponse.json({ success: true, alert });
    } catch (error) {
      console.error('[admin/members/at-risk] Patch failed:', error);
      return NextResponse.json(
        { error: 'Failed to update alert', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/admin/members/at-risk:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

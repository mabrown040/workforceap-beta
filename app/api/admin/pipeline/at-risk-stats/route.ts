import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { THRESHOLDS } from '@/lib/member/atRiskScoring';

/**
 * Resolve the scope filter to apply on `atRiskAlert.user` for this caller.
 *
 * Returns:
 *   - `undefined` for super-admins (no filter — see the whole platform)
 *   - `{ organizationId: orgId }` for tenant admins
 *   - `{ id: { in: assignedMemberIds } }` for non-admin counselors
 *   - `null` to deny (counselor with no assignments / org lookup failed)
 */
async function buildAtRiskUserScope(staffUserId: string): Promise<
  Prisma.UserWhereInput | undefined | null
> {
  if (await isSuperAdmin(staffUserId)) return undefined;
  if (await isAdmin(staffUserId)) {
    try {
      return { organizationId: await getActorOrganizationId(staffUserId) };
    } catch {
      return null;
    }
  }
  // Non-admin counselor — restrict to their assigned members.
  const counselor = await prisma.counselor.findFirst({
    where: { userId: staffUserId, active: true },
    select: { id: true },
  });
  if (!counselor) return null;
  const assignments = await prisma.counselorAssignment.findMany({
    where: { counselorId: counselor.id, active: true },
    select: { memberId: true },
  });
  const ids = assignments.map((a) => a.memberId);
  if (ids.length === 0) return null;
  return { id: { in: ids } };
}

/**
 * GET /api/admin/pipeline/at-risk-stats
 *
 * Returns at-risk alert stats for the admin pipeline dashboard:
 * - criticalCount: number of CRITICAL at-risk alerts today
 * - alertsSentToday: counselor alerts sent today (notifiedCounselorAt)
 * - counselorsWithPending: list of counselors with pending critical alerts
 *
 * Scoping: super-admin sees the whole platform. Tenant admin sees their
 * organization's alerts. Counselor sees only alerts for members assigned
 * to them. Without these guards the endpoint leaked other counselors'
 * and tenants' at-risk workload (incl. counselor names + emails).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (!(await isAdmin(user.id)) && !(await isCounselor(user.id)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build the per-actor scope filter on `user` (the at_risk_alert.user
    // relation). null means "no allowed scope" → return zeroed stats.
    const scopeUserFilter = await buildAtRiskUserScope(user.id);
    if (scopeUserFilter === null) {
      return NextResponse.json({
        criticalCount: 0,
        alertsSentToday: 0,
        counselorsWithPending: [],
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [criticalCount, alertsSentToday, pendingAlerts] = await Promise.all([
      prisma.atRiskAlert.count({
        where: {
          score: { gte: THRESHOLDS.CRITICAL },
          status: { in: ['open', 'acknowledged'] },
          ...(scopeUserFilter ? { user: scopeUserFilter } : {}),
        },
      }),
      prisma.atRiskAlert.count({
        where: {
          notifiedCounselorAt: { gte: todayStart },
          ...(scopeUserFilter ? { user: scopeUserFilter } : {}),
        },
      }),
      prisma.atRiskAlert.findMany({
        where: {
          score: { gte: THRESHOLDS.CRITICAL },
          status: { in: ['open', 'acknowledged'] },
          ...(scopeUserFilter ? { user: scopeUserFilter } : {}),
        },
        select: {
          user: {
            select: {
              counselorAssignments: {
                where: { active: true },
                select: {
                  counselor: {
                    select: {
                      user: { select: { fullName: true, email: true } },
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    // Roll up pending alerts by counselor
    const counselorMap = new Map<
      string,
      { name: string; email: string; memberCount: number }
    >();

    for (const alert of pendingAlerts) {
      const c = alert.user.counselorAssignments[0]?.counselor?.user;
      if (!c?.email) continue;
      const existing = counselorMap.get(c.email);
      if (existing) {
        existing.memberCount++;
      } else {
        counselorMap.set(c.email, {
          name: c.fullName ?? 'Unknown',
          email: c.email,
          memberCount: 1,
        });
      }
    }

    return NextResponse.json({
      criticalCount,
      alertsSentToday,
      counselorsWithPending: Array.from(counselorMap.values()).sort(
        (a, b) => b.memberCount - a.memberCount
      ),
    });
  } catch (error) {
    console.error('/admin/pipeline/at-risk-stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

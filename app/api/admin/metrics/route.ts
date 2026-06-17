import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getAdminMetrics } from '@/lib/admin/metrics';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';

async function computeAdminRouteMetricsPayload(orgId: string) {
  const metrics = await getAdminMetrics(orgId);

  const assessmentCompleted = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM users
      WHERE assessment_completed = true AND deleted_at IS NULL
        AND organization_id = ${orgId}
    `;

  const dashboardViews = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT me.user_id)::int as count
      FROM member_events me
      INNER JOIN users u ON u.id = me.user_id AND u.organization_id = ${orgId}
      WHERE me.event_name = 'member_dashboard_viewed'
    `;

  const dashboardActivated = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM member_events me
      INNER JOIN users u ON u.id = me.user_id AND u.organization_id = ${orgId}
      WHERE me.event_name = 'member_dashboard_activated'
    `;

  const aiToolUsers = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT s.user_id)::int as count
      FROM (
        SELECT air.user_id FROM ai_tool_results air
        INNER JOIN users u ON u.id = air.user_id AND u.organization_id = ${orgId}
        UNION
        SELECT me.user_id FROM member_events me
        INNER JOIN users u2 ON u2.id = me.user_id AND u2.organization_id = ${orgId}
        WHERE me.event_name = 'ai_tool_run_started' AND me.entity_type = 'ai_tool'
      ) s
    `;

  const jobApplicationUsers = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT ja.user_id)::int as count
      FROM job_applications ja
      INNER JOIN users u ON u.id = ja.user_id AND u.organization_id = ${orgId}
      WHERE ja.status <> 'SAVED'
    `;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentPlacements = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM placement_records pr
      INNER JOIN users u ON u.id = pr.user_id AND u.organization_id = ${orgId}
      WHERE pr.placed_at >= ${thirtyDaysAgo}
    `;

  const avgSalary = await prisma.$queryRaw<{ avg: number | null }[]>`
      SELECT AVG(pr.salary_offered)::float as avg
      FROM placement_records pr
      INNER JOIN users u ON u.id = pr.user_id AND u.organization_id = ${orgId}
      WHERE pr.salary_offered IS NOT NULL
    `;

  const weeklySignups = await prisma.$queryRaw<{ week: string; count: number }[]>`
      SELECT DATE_TRUNC('week', created_at)::text as week, COUNT(*)::int as count
      FROM users
      WHERE created_at >= ${thirtyDaysAgo}
        AND organization_id = ${orgId}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week
    `;

  const weeklyEnrollments = await prisma.$queryRaw<{ week: string; count: number }[]>`
      SELECT DATE_TRUNC('week', ce.created_at)::text as week, COUNT(*)::int as count
      FROM course_enrollments ce
      WHERE ce.created_at >= ${thirtyDaysAgo}
        AND ce.organization_id = ${orgId}
      GROUP BY DATE_TRUNC('week', ce.created_at)
      ORDER BY week
    `;

  const weeklyDashboardViews = await prisma.$queryRaw<{ week: string; count: number }[]>`
      SELECT DATE_TRUNC('week', me.created_at)::text as week, COUNT(*)::int as count
      FROM member_events me
      INNER JOIN users u ON u.id = me.user_id AND u.organization_id = ${orgId}
      WHERE me.event_name = 'member_dashboard_viewed' AND me.created_at >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('week', me.created_at)
      ORDER BY week
    `;

  // ── Work Queue counts ──
  const pendingApplications = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM applications a
      INNER JOIN users u ON u.id = a.user_id AND u.organization_id = ${orgId}
      WHERE a.status = 'PENDING'
    `;

  const criticalAtRisk = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT ara.user_id)::int as count
      FROM at_risk_alerts ara
      INNER JOIN users u ON u.id = ara.user_id AND u.organization_id = ${orgId}
      WHERE ara.status = 'open' AND ara.score >= 80
    `;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const staleTraining = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM users
      WHERE stale_training_detected_at IS NOT NULL
        AND stale_training_detected_at <= ${sevenDaysAgo}
        AND deleted_at IS NULL
        AND organization_id = ${orgId}
    `;

  const unmatchedCoursera = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT cp.user_id)::int as count
      FROM course_progress cp
      INNER JOIN users u ON u.id = cp.user_id AND u.organization_id = ${orgId}
      WHERE cp.status IN ('unmatched', 'error')
    `;

  const total = metrics.totalMembers;
  const enrolled = metrics.placementStats.enrolled;
  const assessed = Number(assessmentCompleted[0].count);
  const dashboardViewers = Number(dashboardViews[0].count);
  const activated = Number(dashboardActivated[0].count);
  const aiRuns = metrics.aiToolRuns;
  const aiUsers = Number(aiToolUsers[0].count);
  const jobApps = metrics.applicationsSubmitted;
  const jobAppUsers = Number(jobApplicationUsers[0].count);

  return {
    summary: {
      totalMembers: total,
      enrolledMembers: enrolled,
      enrollmentRate: total > 0 ? Math.round((enrolled / total) * 100) : 0,
      assessmentRate: total > 0 ? Math.round((assessed / total) * 100) : 0,
      activeDashboardUsers: dashboardViewers,
      activationRate: dashboardViewers > 0 ? Math.round((activated / dashboardViewers) * 100) : 0,
      aiToolRuns: aiRuns,
      jobApplicationsTracked: jobApps,
      totalPlacements: metrics.placementStats.placed,
      recentPlacements: Number(recentPlacements[0].count),
      avgPlacementSalary: Math.round(avgSalary[0].avg ?? 0),
      placementRate: metrics.placementStats.placementRate,
      pendingApplications: Number(pendingApplications[0]?.count ?? 0),
      criticalAtRisk: Number(criticalAtRisk[0]?.count ?? 0),
      staleTraining: Number(staleTraining[0]?.count ?? 0),
      unmatchedCoursera: Number(unmatchedCoursera[0]?.count ?? 0),
    },
    funnels: [
      {
        name: 'Application → Account',
        current: total,
        target: total,
        rate: 100,
        description: 'Members who created accounts',
      },
      {
        name: 'Application → Enrollment',
        current: enrolled,
        target: total,
        rate: total > 0 ? Math.round((enrolled / total) * 100) : 0,
        description: 'Members enrolled in a program',
      },
      {
        name: 'Dashboard Activation',
        current: activated,
        target: dashboardViewers,
        rate: dashboardViewers > 0 ? Math.round((activated / dashboardViewers) * 100) : 0,
        description: 'Dashboard viewers who activated',
      },
      {
        name: 'Assessment Completion',
        current: assessed,
        target: total,
        rate: total > 0 ? Math.round((assessed / total) * 100) : 0,
        description: 'Members who completed assessment',
      },
      {
        name: 'AI Tool Usage',
        current: aiUsers,
        target: total,
        rate: total > 0 ? Math.round((aiUsers / total) * 100) : 0,
        description: 'Members who used at least one AI tool',
      },
      {
        name: 'Job Tracker Usage',
        current: jobAppUsers,
        target: total,
        rate: total > 0 ? Math.round((jobAppUsers / total) * 100) : 0,
        description: 'Members who tracked at least one application',
      },
    ],
    trends: {
      signups: weeklySignups,
      enrollments: weeklyEnrollments,
      dashboardViews: weeklyDashboardViews,
    },
  };
}export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      const orgId = await getActorOrganizationId(user.id);
      const body = await unstable_cache(
        async () => computeAdminRouteMetricsPayload(orgId),
        ['admin-api-metrics-v1', orgId],
        { revalidate: 60 },
      )();
      return NextResponse.json(body);
    } catch (e) {
      console.error('[admin/metrics]', e);
      return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Total members
    const totalMembers = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM users
    `;

    // Enrolled members (have a program)
    const enrolledMembers = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM users WHERE enrolled_program IS NOT NULL
    `;

    // Members who completed assessment
    const assessmentCompleted = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM users WHERE assessment_completed = true
    `;

    // Dashboard views (unique members)
    const dashboardViews = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT user_id)::int as count FROM member_events WHERE event_name = 'member_dashboard_viewed'
    `;

    // Dashboard activations
    const dashboardActivated = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM member_events WHERE event_name = 'member_dashboard_activated'
    `;

    // AI tool runs (completed)
    const aiToolRuns = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM member_events WHERE event_name = 'ai_tool_run_completed'
    `;

    // Job applications tracked
    const jobApplications = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM member_events WHERE event_name = 'application_added'
    `;

    // Weekly trend data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Placement metrics
    const totalPlacements = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM placement_records
    `;

    const recentPlacements = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM placement_records WHERE placed_at >= ${thirtyDaysAgo}
    `;

    const avgSalary = await prisma.$queryRaw<{ avg: number | null }[]>`
      SELECT AVG(salary_offered)::float as avg FROM placement_records WHERE salary_offered IS NOT NULL
    `;

    const weeklySignups = await prisma.$queryRaw<{ week: string; count: number }[]>`
      SELECT DATE_TRUNC('week', created_at)::text as week, COUNT(*)::int as count
      FROM users
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week
    `;

    const weeklyEnrollments = await prisma.$queryRaw<{ week: string; count: number }[]>`
      SELECT DATE_TRUNC('week', created_at)::text as week, COUNT(*)::int as count
      FROM course_enrollments
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week
    `;

    const weeklyDashboardViews = await prisma.$queryRaw<{ week: string; count: number }[]>`
      SELECT DATE_TRUNC('week', created_at)::text as week, COUNT(*)::int as count
      FROM member_events
      WHERE event_name = 'member_dashboard_viewed' AND created_at >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week
    `;

    const total = Number(totalMembers[0].count);
    const enrolled = Number(enrolledMembers[0].count);
    const assessed = Number(assessmentCompleted[0].count);
    const dashboardViewers = Number(dashboardViews[0].count);
    const activated = Number(dashboardActivated[0].count);
    const aiRuns = Number(aiToolRuns[0].count);
    const jobApps = Number(jobApplications[0].count);

    return NextResponse.json({
      summary: {
        totalMembers: total,
        enrolledMembers: enrolled,
        enrollmentRate: total > 0 ? Math.round((enrolled / total) * 100) : 0,
        assessmentRate: total > 0 ? Math.round((assessed / total) * 100) : 0,
        activeDashboardUsers: dashboardViewers,
        activationRate: dashboardViewers > 0 ? Math.round((activated / dashboardViewers) * 100) : 0,
        aiToolRuns: aiRuns,
        jobApplicationsTracked: jobApps,
        totalPlacements: Number(totalPlacements[0].count),
        recentPlacements: Number(recentPlacements[0].count),
        avgPlacementSalary: Math.round(avgSalary[0].avg ?? 0),
        placementRate: enrolled > 0 ? Math.round((Number(totalPlacements[0].count) / enrolled) * 100) : 0,
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
          current: aiRuns,
          target: total,
          rate: total > 0 ? Math.round((aiRuns / total) * 100) : 0,
          description: 'Total AI tool runs by members',
        },
        {
          name: 'Job Tracker Usage',
          current: jobApps,
          target: total,
          rate: total > 0 ? Math.round((jobApps / total) * 100) : 0,
          description: 'Job applications tracked',
        },
      ],
      trends: {
        signups: weeklySignups,
        enrollments: weeklyEnrollments,
        dashboardViews: weeklyDashboardViews,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[admin/metrics]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

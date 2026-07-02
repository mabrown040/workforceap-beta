import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';

// ── Helpers ──

function calculateRetention(
  members: Array<{ enrolledAt: Date | null; placementRecord: { startDate: Date | null } | null }>,
  days: number,
  now: Date,
): number {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const eligible = members.filter((m) => m.enrolledAt && m.enrolledAt <= cutoff);
  if (eligible.length === 0) return 0;
  const retained = eligible.filter((m) => {
    // Retained = still active (no placement yet, or placed after cutoff)
    if (!m.placementRecord) return true;
    if (!m.placementRecord.startDate) return true;
    return m.placementRecord.startDate > cutoff;
  });
  return Math.round((retained.length / eligible.length) * 100);
}

function buildCohorts(
  members: Array<{ enrolledAt: Date | null; placementRecord: { startDate: Date | null } | null }>,
  now: Date,
) {
  const cohorts: Record<string, { month: string; enrolled: number; placed: number; retentionRate: number }> = {};

  for (const m of members) {
    if (!m.enrolledAt) continue;
    const monthKey = m.enrolledAt.toISOString().slice(0, 7); // YYYY-MM
    if (!cohorts[monthKey]) {
      cohorts[monthKey] = { month: monthKey, enrolled: 0, placed: 0, retentionRate: 0 };
    }
    cohorts[monthKey].enrolled++;
    if (m.placementRecord?.startDate) {
      cohorts[monthKey].placed++;
    }
  }

  return Object.values(cohorts)
    .map((c) => ({
      ...c,
      retentionRate: c.enrolled > 0 ? Math.round((c.placed / c.enrolled) * 100) : 0,
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12); // Last 12 months
}

/** A field this route buckets into a categorical breakdown, e.g. `veteranStatus`. */
type DemographicField = 'veteranStatus' | 'employmentStatus' | 'householdIncome' | 'educationLevel' | 'ethnicity';

/** Shape returned by `prisma.profile.groupBy({ by: [field], ... })` for any of the fields above. */
type GroupByRow = { _count: { _all: number } } & Partial<Record<DemographicField, string | null>>;

function toBreakdown(rows: GroupByRow[], field: DemographicField): Array<{ label: string; count: number }> {
  return rows.map((r) => ({ label: r[field] ?? 'Not reported', count: r._count._all }));
}

async function getDemographics(orgId: string) {
  // PERF: 5 cheap indexed aggregates instead of materializing every org
  // profile just to bucket 5 categorical columns in JS.
  const profileWhere = { user: { organizationId: orgId, deletedAt: null } };
  const [veteranStatus, employmentStatus, householdIncome, educationLevel, ethnicity] = await Promise.all([
    prisma.profile.groupBy({ by: ['veteranStatus'], where: profileWhere, _count: { _all: true } }),
    prisma.profile.groupBy({ by: ['employmentStatus'], where: profileWhere, _count: { _all: true } }),
    prisma.profile.groupBy({ by: ['householdIncome'], where: profileWhere, _count: { _all: true } }),
    prisma.profile.groupBy({ by: ['educationLevel'], where: profileWhere, _count: { _all: true } }),
    prisma.profile.groupBy({ by: ['ethnicity'], where: profileWhere, _count: { _all: true } }),
  ]);

  return {
    veteranBreakdown: toBreakdown(veteranStatus, 'veteranStatus'),
    employmentEnteringBreakdown: toBreakdown(employmentStatus, 'employmentStatus'),
    incomeBreakdown: toBreakdown(householdIncome, 'householdIncome'),
    educationBreakdown: toBreakdown(educationLevel, 'educationLevel'),
    ethnicityBreakdown: toBreakdown(ethnicity, 'ethnicity'),
  };
}

/**
 * Computes the outcomes dashboard payload for one org. Pulled out of `_GET`
 * so it can be wrapped in `unstable_cache` — placements/members/demographics
 * are otherwise full org-wide scans re-run on every single page view (this
 * is one of the most-clicked admin analytics pages), matching the caching
 * pattern already used by the sibling admin/metrics and admin/ai-efficacy
 * routes.
 */
async function computeOutcomesPayload(orgId: string) {
  // Placement data, member data, and demographics are independent reads —
  // run them together instead of one round trip at a time.
  const [placements, members, demographics] = await Promise.all([
    prisma.placementRecord.findMany({
      where: {
        user: {
          organizationId: orgId,
        },
      },
      select: {
        salaryOffered: true,
        userId: true,
        programSlug: true,
      },
    }),
    prisma.user.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        enrolledProgram: true,
        enrolledAt: true,
        coursesCompleted: true,
        placementRecord: {
          select: {
            salaryOffered: true,
            startDate: true,
          },
        },
      },
    }),
    getDemographics(orgId),
  ]);

  // Calculate metrics
  const totalMembers = members.length;
  const enrolledMembers = members.filter((m) => m.enrolledProgram !== null).length;
  const completedMembers = members.filter((m) => {
    const completed = m.coursesCompleted as string[] | null;
    return completed && completed.length > 0;
  }).length;
  const placedMembers = members.filter((m) => m.placementRecord !== null).length;

  const placementRate = enrolledMembers > 0
    ? Math.round((placedMembers / enrolledMembers) * 100)
    : 0;

  const completionRate = enrolledMembers > 0
    ? Math.round((completedMembers / enrolledMembers) * 100)
    : 0;

  // Salary analysis
  const salaries = placements
    .map((p) => p.salaryOffered)
    .filter((s): s is number => s !== null && s !== undefined);

  const avgSalary = salaries.length > 0
    ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length)
    : 0;

  const salaryRange = salaries.length > 0
    ? { min: Math.min(...salaries), max: Math.max(...salaries) }
    : { min: 0, max: 0 };

  // Program effectiveness
  const programStats: Record<string, { title: string; enrollments: number; completions: number; placements: number }> = {};

  for (const member of members) {
    const slug = member.enrolledProgram;
    if (!slug) continue;

    if (!programStats[slug]) {
      programStats[slug] = {
        title: slug,
        enrollments: 0,
        completions: 0,
        placements: 0,
      };
    }
    programStats[slug].enrollments++;

    const completed = member.coursesCompleted as string[] | null;
    if (completed && completed.length > 0) {
      programStats[slug].completions++;
    }

    if (member.placementRecord) {
      programStats[slug].placements++;
    }
  }

  // ── Retention rates (30/60/90-day) ──
  const now = new Date();
  const enrolledMembersWithDate = members.filter((m) => m.enrolledAt !== null);
  const retention30 = calculateRetention(enrolledMembersWithDate, 30, now);
  const retention60 = calculateRetention(enrolledMembersWithDate, 60, now);
  const retention90 = calculateRetention(enrolledMembersWithDate, 90, now);

  // ── Cohort comparison (month-over-month) ──
  const cohorts = buildCohorts(members, now);

  return {
    metrics: {
      totalMembers,
      enrolledMembers,
      completedMembers,
      placedMembers,
      placementRate,
      completionRate,
      avgSalary,
      salaryRange,
      retention: {
        d30: retention30,
        d60: retention60,
        d90: retention90,
      },
    },
    programStats: Object.entries(programStats).map(([slug, stats]) => ({
      slug,
      ...stats,
      completionRate: stats.enrollments > 0
        ? Math.round((stats.completions / stats.enrollments) * 100)
        : 0,
      placementRate: stats.enrollments > 0
        ? Math.round((stats.placements / stats.enrollments) * 100)
        : 0,
    })),
    cohorts,
    demographics,
  };
}

/**
 * GET /api/admin/outcomes
 * Admin outcomes dashboard data — placement rates, salary data, program effectiveness,
 * retention rates (30/60/90-day), cohort comparison, and demographic breakdowns.
 * Requires admin access. Returns aggregated metrics for the admin's organization.
 */
async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await isAdmin(user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // PERF: cache the aggregated payload for a few minutes — this route
    // otherwise rescans placements/members/profiles org-wide on every page
    // view. Audit logging stays outside the cache so every real view is
    // still recorded.
    const payload = await unstable_cache(
      () => computeOutcomesPayload(orgId),
      ['admin-outcomes-v1', orgId],
      { revalidate: 300 },
    )();

    auditLog({ actorUserId: user.id, action: 'admin_outcomes_view', targetType: 'OutcomesDashboard', targetId: 'aggregate', metadata: { orgId } }).catch((err) => console.error('[audit] admin_outcomes_view:', err));
    logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'viewed',
      object: { type: 'OutcomesDashboard', id: 'aggregate' },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] viewed outcomes:', err));

    return NextResponse.json(payload);
  } catch (error) {
    console.error('GET /api/admin/outcomes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);

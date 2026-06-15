import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';

/**
 * GET /api/admin/outcomes
 * Admin outcomes dashboard data — placement rates, salary data, program effectiveness.
 * Requires admin access. Returns aggregated metrics for the admin's organization.
 */
export async function GET(request: NextRequest) {
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

    // Aggregate placement data
    const placements = await prisma.placementRecord.findMany({
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
    });

    // Aggregate member data
    const members = await prisma.user.findMany({
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
    });

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

    // Audit log
    await logAuditEvent({
      user: { id: user.id },
      verb: 'viewed',
      object: { type: 'OutcomesDashboard', id: 'aggregate' },
      request: auditRequestMeta(request),
    });

    return NextResponse.json({
      metrics: {
        totalMembers,
        enrolledMembers,
        completedMembers,
        placedMembers,
        placementRate,
        completionRate,
        avgSalary,
        salaryRange,
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
    });
  } catch (error) {
    console.error('GET /api/admin/outcomes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

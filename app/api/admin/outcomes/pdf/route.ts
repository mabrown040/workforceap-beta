import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * GET /api/admin/outcomes/pdf
 * Generates a PDF-ready JSON payload for board meeting outcomes reports.
 * WIOA funders and board members need printable, shareable summaries.
 * This endpoint returns structured data that the frontend renders to PDF
 * via a print stylesheet or a PDF generation library (e.g., react-pdf, puppeteer).
 *
 * Requires admin access.
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

    const now = new Date();
    const ytdStart = new Date(now.getFullYear(), 0, 1);

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
        startDate: true,
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

    const totalMembers = members.length;
    const enrolledMembers = members.filter((m) => m.enrolledProgram !== null).length;
    const placedMembers = members.filter((m) => m.placementRecord !== null).length;
    const placementRate = enrolledMembers > 0
      ? Math.round((placedMembers / enrolledMembers) * 100)
      : 0;

    const salaries = placements
      .map((p) => p.salaryOffered)
      .filter((s): s is number => s !== null && s !== undefined);
    const avgSalary = salaries.length > 0
      ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length)
      : 0;
    const medianSalary = median(salaries);

    // YTD metrics
    const ytdPlacements = placements.filter((p) => p.startDate && p.startDate >= ytdStart);
    const ytdPlacedMembers = ytdPlacements.length;
    const ytdPlacementRate = enrolledMembers > 0
      ? Math.round((ytdPlacedMembers / enrolledMembers) * 100)
      : 0;

    // Program-level outcomes
    const programStats: Record<string, { title: string; enrolled: number; placed: number; placementRate: number }> = {};
    for (const member of members) {
      const slug = member.enrolledProgram;
      if (!slug) continue;
      if (!programStats[slug]) {
        programStats[slug] = { title: slug, enrolled: 0, placed: 0, placementRate: 0 };
      }
      programStats[slug].enrolled++;
      if (member.placementRecord) {
        programStats[slug].placed++;
      }
    }
    const programOutcomes = Object.entries(programStats).map(([slug, stats]) => ({
      slug,
      ...stats,
      placementRate: stats.enrolled > 0 ? Math.round((stats.placed / stats.enrolled) * 100) : 0,
    })).sort((a, b) => b.placementRate - a.placementRate);

    // Demographics
    const demographics = await getDemographics(orgId);

    auditLog({ actorUserId: user.id, action: 'admin_outcomes_pdf_export', targetType: 'OutcomesReport', targetId: 'pdf', metadata: { orgId } }).catch((err) => console.error('[audit] admin_outcomes_pdf_export:', err));
    await logAuditEvent({
      user: { id: user.id },
      verb: 'exported',
      object: { type: 'OutcomesReport', id: 'pdf' },
      request: auditRequestMeta(request),
      orgId,
    });

    return NextResponse.json({
      report: {
        generatedAt: now.toISOString(),
        period: {
          label: 'Year-to-Date',
          startDate: ytdStart.toISOString(),
          endDate: now.toISOString(),
        },
        organization: orgId,
        summary: {
          totalMembers,
          enrolledMembers,
          placedMembers,
          placementRate,
          avgSalary,
          medianSalary,
          ytdPlacedMembers,
          ytdPlacementRate,
        },
        programOutcomes,
        demographics,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/outcomes/pdf error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

async function getDemographics(orgId: string) {
  const profiles = await prisma.profile.findMany({
    where: {
      user: {
        organizationId: orgId,
        deletedAt: null,
      },
    },
    select: {
      veteranStatus: true,
      employmentStatus: true,
      householdIncome: true,
      educationLevel: true,
      ethnicity: true,
    },
  });

  const counts = <T extends string>(field: keyof typeof profiles[0]) => {
    const map = new Map<T | 'Not reported', number>();
    for (const p of profiles) {
      const val = (p[field] as T | null) ?? 'Not reported';
      map.set(val, (map.get(val) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  };

  return {
    veteranBreakdown: counts('veteranStatus'),
    employmentEnteringBreakdown: counts('employmentStatus'),
    incomeBreakdown: counts('householdIncome'),
    educationBreakdown: counts('educationLevel'),
    ethnicityBreakdown: counts('ethnicity'),
  };
}
export const GET = withApiGuc(_GET);

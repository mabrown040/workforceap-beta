import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { analyzeAIEfficacy } from '@/lib/analytics/aiToolEfficacy';
import { buildPageMetadataAsync } from '@/app/seo';
import { AiEfficacyKit } from '@/components/portal/kit/pages/admin-subviews/AiEfficacyKit';
import AIEfficacyDashboard from './AIEfficacyDashboardLazy';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'AI Tool Efficacy',
    description: 'Measure whether AI tools improve placement outcomes',
    path: '/admin/analytics/ai-efficacy',
  });
}

/**
 * Derive a qualitative confidence label from real cohort data. There is no
 * statistical test computed upstream, so this reads cohort size + effect size
 * rather than fabricating a p-value:
 *   - "Insufficient data" when either cohort is too small to compare.
 *   - "High"/"Moderate"/"Low" scale with the smaller cohort size and lift.
 */
function deriveConfidence(args: {
  usersWithTool: number;
  usersWithoutTool: number;
  lift: number;
}): string {
  const { usersWithTool, usersWithoutTool, lift } = args;
  const minCohort = Math.min(usersWithTool, usersWithoutTool);
  if (usersWithTool === 0 || usersWithoutTool === 0) return '—';
  if (minCohort < 10) return 'Low';
  const absLift = Math.abs(lift);
  if (minCohort >= 50 && absLift >= 10) return 'High';
  if (minCohort >= 20 && absLift >= 5) return 'Moderate';
  return 'Low';
}

export default async function AIEfficacyPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/analytics/ai-efficacy');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const requestedUi = typeof params.ui === 'string' ? params.ui : null;

  // Legacy → the original recharts dashboard with the date-range picker.
  if (requestedUi === 'legacy') {
    return <AIEfficacyDashboard />;
  }

  // --- DEFAULT: real (lean) cohort lift summary (design kit) ---

  const superAdmin = await isSuperAdmin(user.id);
  const orgId = superAdmin ? null : await getActorOrganizationId(user.id).catch(() => null);
  if (!orgId) {
    // No tenant context → fall back to the proven legacy dashboard rather than
    // render an empty kit.
    return <AIEfficacyDashboard />;
  }

  // Default window mirrors the legacy dashboard: trailing 90 days.
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const report = await analyzeAIEfficacy(orgId, { start, end }).catch((err) => {
    console.error('[admin/analytics/ai-efficacy] analysis failed', err);
    return null;
  });

  if (!report) {
    return <AIEfficacyDashboard />;
  }

  const any = report.overall.anyTool;
  const lift = any.placementRateWith - any.placementRateWithout;
  const totalAnalyzed = any.usersWithTool + any.usersWithoutTool;
  const topTool = report.topTools[0]
    ? { label: report.topTools[0].toolLabel, lift: report.topTools[0].placementLift }
    : null;

  return (
    <AiEfficacyKit
      placementRateWith={any.placementRateWith}
      placementRateWithout={any.placementRateWithout}
      usersWithTool={any.usersWithTool}
      usersWithoutTool={any.usersWithoutTool}
      confidence={deriveConfidence({
        usersWithTool: any.usersWithTool,
        usersWithoutTool: any.usersWithoutTool,
        lift,
      })}
      rangeStart={report.dateRange.start}
      rangeEnd={report.dateRange.end}
      totalAnalyzed={totalAnalyzed}
      topTool={topTool}
    />
  );
}

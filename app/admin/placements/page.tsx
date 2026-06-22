import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import PlacementsTableClient from '@/components/admin/PlacementsTableClient';
import {
  PlacementsKit,
  type PlacementRow,
} from '@/components/portal/kit/pages/admin-subviews/PlacementsKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Placements',
    description: 'Every recorded job placement — employer, role, wage, and verification status.',
    path: '/admin/placements',
  });
}

const placementListSelect = {
  id: true,
  employerName: true,
  jobTitle: true,
  startDate: true,
  startDateVerified: true,
  salaryOffered: true,
  retentionDecision: true,
  retentionStatus: true,
  placedAt: true,
  user: {
    select: { id: true, fullName: true, email: true, enrolledProgram: true },
  },
} satisfies Prisma.PlacementRecordSelect;

type PlacementRecord = Prisma.PlacementRecordGetPayload<{ select: typeof placementListSelect }>;

/** "$52k" for round-thousands wages, "$52,300" otherwise; "—" when unknown. */
function formatWageShort(salary: number | null): string {
  if (salary == null || salary <= 0) return '—';
  if (salary >= 1000 && salary % 1000 === 0) return `$${Math.round(salary / 1000)}k`;
  if (salary >= 10000) return `$${Math.round(salary / 1000)}k`;
  return `$${salary.toLocaleString()}`;
}

/** A retention value counts as retained if it explicitly says so. */
function isRetained(record: Pick<PlacementRecord, 'retentionDecision' | 'retentionStatus'>): boolean {
  const decision = record.retentionDecision?.toLowerCase() ?? '';
  const status = record.retentionStatus?.toLowerCase() ?? '';
  return decision === 'retained' || status.includes('retained');
}

export default async function AdminPlacementsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/placements');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const requestedUi = typeof params.ui === 'string' ? params.ui : null;

  const placements: PlacementRecord[] = await prisma.placementRecord.findMany({
    orderBy: { placedAt: 'desc' },
    take: 500,
    select: placementListSelect,
  });

  // Legacy → the original sortable/exportable admin table.
  if (requestedUi === 'legacy') {
    const pendingCount = placements.filter((p) => !p.startDateVerified).length;
    return (
      <PortalPageFrame>
        <PageHeader
          title="Placements"
          subtitle={`${placements.length.toLocaleString()} recorded placements — ${pendingCount.toLocaleString()} awaiting start-date verification.`}
          action={
            <Link href="/admin/placements/new" className="btn btn-outline">
              Record placement
            </Link>
          }
        />
        <PlacementsTableClient placements={placements} />
      </PortalPageFrame>
    );
  }

  // --- DEFAULT: real (lean) confirmed-hires & wage data (design kit) ---

  // Which placements have a completed follow-up survey → "Survey: Done".
  // Lean groupBy over completed surveys only; degrades to "Pending" on failure.
  const completedSurveyIds = new Set<string>();
  try {
    const completed = await prisma.placementSurvey.groupBy({
      by: ['placementId'],
      where: { completedAt: { not: null } },
      _count: { _all: true },
    });
    for (const row of completed) completedSurveyIds.add(row.placementId);
  } catch (err) {
    console.error('[admin/placements] survey aggregate failed', err);
  }

  // Avg wage across placements that recorded a salary (lean aggregate).
  let avgWage = '—';
  try {
    const agg = await prisma.placementRecord.aggregate({
      where: { salaryOffered: { gt: 0 } },
      _avg: { salaryOffered: true },
    });
    avgWage = formatWageShort(
      agg._avg.salaryOffered != null ? Math.round(agg._avg.salaryOffered) : null,
    );
  } catch (err) {
    console.error('[admin/placements] wage aggregate failed', err);
  }

  // YTD placements (count) — placed since Jan 1 of the current year.
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  let ytd = 0;
  try {
    ytd = await prisma.placementRecord.count({ where: { placedAt: { gte: yearStart } } });
  } catch (err) {
    console.error('[admin/placements] ytd count failed', err);
    ytd = placements.filter((p) => p.placedAt >= yearStart).length;
  }

  // Retention 90d — share of placements with a recorded retained outcome.
  // Computed off the loaded rows (no extra query); "—" when none have a value.
  const withRetention = placements.filter(
    (p) => p.retentionDecision != null || p.retentionStatus != null,
  );
  const retainedCount = withRetention.filter(isRetained).length;
  const retention90d =
    withRetention.length > 0
      ? `${Math.round((retainedCount / withRetention.length) * 100)}%`
      : '—';

  // To Confirm — hires still awaiting start-date verification.
  const toConfirm = placements.filter((p) => !p.startDateVerified).length;

  const rows: PlacementRow[] = placements.map((p) => ({
    id: p.id,
    memberId: p.user?.id ?? null,
    student: p.user?.fullName?.trim() || p.user?.email || 'Unknown member',
    employer: p.employerName || '—',
    role: p.jobTitle || '—',
    wage: formatWageShort(p.salaryOffered),
    survey: completedSurveyIds.has(p.id) ? 'Done' : 'Pending',
    status: p.startDateVerified ? 'Confirmed' : 'Pending',
  }));

  return (
    <PlacementsKit
      placements={rows}
      ytd={ytd}
      avgWage={avgWage}
      retention90d={retention90d}
      toConfirm={toConfirm}
      total={placements.length}
    />
  );
}

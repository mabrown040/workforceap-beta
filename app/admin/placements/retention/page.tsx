import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import { prisma } from '@/lib/db/prisma';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/portal/ui/DataTable';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Retention decisions due',
    description: 'Placements past their onboarding window with no recorded 90/180-day retention decision.',
    path: '/admin/placements/retention',
  });
}

/** A placement counts toward the retention-decision queue once it is ≥80 days old. */
const NINETY_DAY_WINDOW_START_DAYS = 80;
/** Past this many days a placement is in the 180-day decision bucket. */
const ONE_EIGHTY_DAY_WINDOW_START_DAYS = 170;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const retentionQueueSelect = {
  id: true,
  employerName: true,
  jobTitle: true,
  placedAt: true,
  user: {
    select: { id: true, fullName: true, email: true },
  },
} satisfies Prisma.PlacementRecordSelect;

type RetentionQueueRow = Prisma.PlacementRecordGetPayload<{ select: typeof retentionQueueSelect }>;

function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function RetentionDecisionsQueuePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/placements/retention');
  // NOTE: the sibling /admin/placements page — and every other route in the
  // `/admin` tree — is gated admin-only by app/admin/layout.tsx (isAdmin()).
  // There is no counselor bypass anywhere under /admin today (verified:
  // layout redirects to /dashboard for any non-admin before this page even
  // renders). Making this specific queue counselor-accessible would require
  // widening that shared layout check to `isAdmin || isCounselor`, which
  // would open every other /admin/* page to counselors too — a materially
  // bigger, riskier change than this task's brief. Kept admin-only to match
  // the actual current pattern; counselors are instead notified directly by
  // the reminder cron (app/api/cron/retention-decisions) via in-app
  // notification rather than needing to browse this admin page themselves.
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const now = new Date();
  const eightyDaysAgo = new Date(now.getTime() - NINETY_DAY_WINDOW_START_DAYS * MS_PER_DAY);

  const userOrg = inheritUserOrg(scope);
  const undecidedFilter: Prisma.PlacementRecordWhereInput = {
    OR: [{ retentionDecision: null }, { retentionDecision: 'pending' }],
    ...userOrg,
  };

  const [rows, totalUndecided] = await withAdminPageScope(scope, (db) => Promise.all([
    db.placementRecord.findMany({
      where: { ...undecidedFilter, placedAt: { lte: eightyDaysAgo } },
      orderBy: { placedAt: 'asc' },
      take: 500,
      select: retentionQueueSelect,
    }),
    db.placementRecord.count({ where: undecidedFilter }),
  ]));

  // Batched lookup of each placement's latest completed survey response —
  // one query for the whole page, no per-row N+1.
  const latestStillEmployed = new Map<string, boolean | null>();
  if (rows.length > 0) {
    const surveys = await withAdminPageScope(scope, (db) => db.placementSurvey.findMany({
      where: { placementId: { in: rows.map((r) => r.id) }, completedAt: { not: null }, ...userOrg },
      orderBy: { completedAt: 'desc' },
      select: { placementId: true, stillEmployed: true },
    }));
    for (const s of surveys) {
      // Ordered desc by completedAt — first hit per placementId is the latest.
      if (!latestStillEmployed.has(s.placementId)) {
        latestStillEmployed.set(s.placementId, s.stillEmployed);
      }
    }
  }

  const due90 = rows.filter((r) => {
    const d = daysSince(r.placedAt, now);
    return d >= NINETY_DAY_WINDOW_START_DAYS && d < ONE_EIGHTY_DAY_WINDOW_START_DAYS;
  }).length;
  const due180 = rows.filter((r) => daysSince(r.placedAt, now) >= ONE_EIGHTY_DAY_WINDOW_START_DAYS).length;

  const columns: DataTableColumn<RetentionQueueRow>[] = [
    {
      key: 'member',
      header: 'Member',
      cell: (r) =>
        r.user ? (
          <Link href={`/admin/members/${r.user.id}#placed-outcome`} className="wa-font-medium wa-text-blue-700 hover:wa-underline">
            {r.user.fullName?.trim() || r.user.email}
          </Link>
        ) : (
          <span className="wa-text-gray-500">Unknown member</span>
        ),
    },
    {
      key: 'employer',
      header: 'Employer',
      cell: (r) => <span className="wa-text-gray-600">{r.employerName || '—'}</span>,
    },
    {
      key: 'jobTitle',
      header: 'Job title',
      cell: (r) => <span className="wa-text-gray-600">{r.jobTitle || '—'}</span>,
      hideOnMobile: true,
    },
    {
      key: 'placedAt',
      header: 'Placed',
      cell: (r) => <span className="wa-text-gray-500 wa-text-xs">{formatDate(r.placedAt)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'daysSince',
      header: 'Days since placement',
      align: 'center',
      cell: (r) => {
        const days = daysSince(r.placedAt, now);
        const bucket = days >= ONE_EIGHTY_DAY_WINDOW_START_DAYS ? '180-day' : '90-day';
        return (
          <span
            className={days >= ONE_EIGHTY_DAY_WINDOW_START_DAYS ? 'wa-text-red-600 wa-font-medium' : 'wa-text-amber-600 wa-font-medium'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {days} ({bucket})
          </span>
        );
      },
    },
    {
      key: 'surveySignal',
      header: 'Latest survey signal',
      align: 'center',
      cell: (r) => {
        const signal = latestStillEmployed.has(r.id) ? latestStillEmployed.get(r.id) : undefined;
        if (signal === true) return <span className="wa-text-green-600 wa-font-medium">Employed</span>;
        if (signal === false) return <span className="wa-text-red-600">Not employed</span>;
        return <span className="wa-text-gray-400">No survey</span>;
      },
    },
    {
      key: 'decide',
      header: 'Decide',
      cell: (r) =>
        r.user ? (
          <Link href={`/admin/members/${r.user.id}#placed-outcome`} className="btn btn-outline btn-sm">
            Record decision
          </Link>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <PortalPageFrame>
      <PageHeader
        title="Retention decisions due"
        subtitle={`${totalUndecided.toLocaleString()} placement${totalUndecided === 1 ? '' : 's'} with no recorded 90/180-day retention decision — ${rows.length.toLocaleString()} are already past the onboarding window and actionable now.`}
        action={
          <Link href="/admin/placements" className="btn btn-outline">
            Back to placements
          </Link>
        }
      />

      <div className="wa-grid wa-grid-cols-2 md:wa-grid-cols-3 wa-gap-4 wa-mb-8">
        <StatCard label="Due for 90-day decision" value={due90} hint="80–169 days since placement" />
        <StatCard label="Due for 180-day decision" value={due180} hint="170+ days since placement" />
        <StatCard label="Total undecided" value={totalUndecided} hint="Across all placements, any age" />
      </div>

      <div className="wa-bg-white wa-rounded-lg wa-shadow wa-overflow-hidden">
        <div className="wa-px-6 wa-py-4 wa-border-b">
          <h2 className="wa-text-lg wa-font-semibold">Placements awaiting a decision</h2>
        </div>
        <DataTable<RetentionQueueRow>
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          variant="admin"
          tableClassName="admin-table"
          emptyState={
            <div className="wa-px-6 wa-py-12 wa-text-center wa-text-gray-500">
              Nothing due right now — every placement past its onboarding window has a recorded decision.
            </div>
          }
        />
      </div>
    </PortalPageFrame>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="wa-bg-white wa-rounded-lg wa-shadow wa-p-4">
      <div className="wa-text-xs wa-font-medium wa-uppercase wa-text-gray-500 wa-mb-2">{label}</div>
      <div className="wa-text-2xl wa-font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value.toLocaleString()}
      </div>
      <div className="wa-text-xs wa-text-gray-400 wa-mt-1">{hint}</div>
    </div>
  );
}

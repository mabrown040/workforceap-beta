import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import {
  inheritMemberOrg,
  inheritUserOrg,
  resolveAdminPageTenant,
  withAdminPageScope,
} from '@/lib/tenant/adminPageScope';
import PageHeader from '@/components/portal/PageHeader';
import AdminCounselorsClient from '@/components/admin/AdminCounselorsClient';
import {
  CounselorsRosterKit,
  type CounselorRow,
} from '@/components/portal/kit/pages/admin-subviews/CounselorsRosterKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Counselors',
    description: 'Staff caseload & performance — WorkforceAP counselors and advisors.',
    path: '/admin/counselors',
  });
}

/** Members idle this long count toward a counselor's "at-risk" tally. */
const AT_RISK_IDLE_DAYS = 21;

/** Build initials from a full name (e.g. "Sarah Chen" → "SC"). */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Affiliation/title caption for the counselor name cell. */
function captionFor(args: {
  affiliation: string;
  partnerName: string | null;
  title: string | null;
}): string {
  const org =
    args.affiliation === 'independent'
      ? 'Independent Advisor'
      : args.partnerName ?? 'WorkforceAP';
  return args.title ? `${org} · ${args.title}` : org;
}

export default async function AdminCounselorsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/counselors');

  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const requestedUi = typeof params.ui === 'string' ? params.ui : null;

  // Legacy → the original add-counselor form + flat roster list.
  if (requestedUi === 'legacy') {
    const partners = await withAdminPageScope(scope, (db) =>
      db.partner.findMany({
        take: 5000,
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    );

    return (
      <div className="admin-main-content">
        <PageHeader
          title="Counselors & Advisors"
          subtitle="Manage WorkforceAP staff, partner-affiliated counselors, and independent advisors."
        />
        <AdminCounselorsClient partners={partners} />
      </div>
    );
  }

  // --- DEFAULT: real (lean) caseload & performance roster (design kit) ---

  const idleCutoff = new Date();
  idleCutoff.setDate(idleCutoff.getDate() - AT_RISK_IDLE_DAYS);

  // Active counselors + their active assignments (with the member signals we
  // aggregate). Two lean findMany calls in parallel; if either core query
  // fails we fall back to the proven legacy form rather than a fake kit.
  const [counselorsResult, assignmentsResult] = await withAdminPageScope(scope, (db) =>
    Promise.allSettled([
      db.counselor.findMany({
        where: { active: true, ...inheritUserOrg(scope) },
        take: 500,
        orderBy: [{ partner: { name: 'asc' } }, { user: { fullName: 'asc' } }],
        select: {
          id: true,
          affiliation: true,
          title: true,
          partner: { select: { name: true } },
          user: { select: { fullName: true } },
        },
      }),
      db.counselorAssignment.findMany({
        where: { active: true, ...inheritMemberOrg(scope) },
        take: 20000,
        select: {
          counselorId: true,
          member: { select: { memberStatus: true, lastLoginAt: true } },
        },
      }),
    ]),
  );

  if (counselorsResult.status === 'rejected') {
    console.error('[admin/counselors] counselor load failed', counselorsResult.reason);
    redirect('/admin/counselors?ui=legacy');
  }

  const counselorRecords = counselorsResult.value;
  const counselorAssignmentsLoadFailed = assignmentsResult.status === 'rejected';

  // Aggregate caseload / at-risk / placements per counselor from the active
  // assignments. A failed aggregate degrades to zeros (roster still renders).
  type Agg = { caseload: number; atRisk: number; placements: number };
  const aggMap = new Map<string, Agg>();
  for (const c of counselorRecords) aggMap.set(c.id, { caseload: 0, atRisk: 0, placements: 0 });

  if (assignmentsResult.status === 'fulfilled') {
    for (const a of assignmentsResult.value) {
      const agg = aggMap.get(a.counselorId);
      if (!agg) continue; // assignment for an inactive/filtered counselor
      agg.caseload += 1;
      if (a.member.memberStatus === 'placed') agg.placements += 1;
      // At-risk: explicitly inactive, or no login within the idle window.
      const lastLogin = a.member.lastLoginAt;
      if (a.member.memberStatus === 'inactive' || !lastLogin || lastLogin < idleCutoff) {
        agg.atRisk += 1;
      }
    }
  } else {
    console.error('[admin/counselors] assignment aggregate failed', assignmentsResult.reason);
  }

  const total = counselorRecords.length;
  const totalCaseload = counselorRecords.reduce(
    (sum, c) => sum + (aggMap.get(c.id)?.caseload ?? 0),
    0,
  );
  const avgCaseload = total > 0 ? Math.round(totalCaseload / total) : 0;
  const atRiskOwned = counselorRecords.reduce(
    (sum, c) => sum + (aggMap.get(c.id)?.atRisk ?? 0),
    0,
  );

  // Load tone vs the cohort average: >15% over avg = Over, >15% under = Light.
  const overBand = avgCaseload * 1.15;
  const lightBand = avgCaseload * 0.85;

  const counselors: CounselorRow[] = counselorRecords
    .map((c) => {
      const agg = aggMap.get(c.id) ?? { caseload: 0, atRisk: 0, placements: 0 };
      const name = c.user.fullName?.trim() || 'Unnamed counselor';
      const load: CounselorRow['load'] =
        avgCaseload === 0
          ? 'Balanced'
          : agg.caseload > overBand
            ? 'Over'
            : agg.caseload < lightBand
              ? 'Light'
              : 'Balanced';
      return {
        id: c.id,
        name,
        initials: initialsFrom(name),
        caption: captionFor({
          affiliation: c.affiliation,
          partnerName: c.partner?.name ?? null,
          title: c.title,
        }),
        caseload: agg.caseload,
        atRisk: agg.atRisk,
        placements: agg.placements,
        // First-response timing isn't readily aggregable without a heavy
        // per-thread scan over the pooler, so we surface "—" rather than fake it.
        avgResponse: '—',
        load,
      };
    })
    .sort((a, b) => b.caseload - a.caseload);

  return (
    <>
      {counselorAssignmentsLoadFailed ? <span hidden data-portal-error-state="admin-counselors-assignment-load" /> : null}
      <CounselorsRosterKit
        counselors={counselors}
        total={total}
        avgCaseload={avgCaseload}
        atRiskOwned={atRiskOwned}
        avgResponse="—"
      />
    </>
  );
}

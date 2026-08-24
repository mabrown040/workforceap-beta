import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import { prisma } from '@/lib/db/prisma';
import { DesignSurface } from '@/components/portal/kit';
import {
  SubgroupsDirectoryKit,
  type SubgroupCard,
  type SubgroupKind,
} from '@/components/portal/kit/pages/admin-subviews/SubgroupsDirectoryKit';
import AdminSubgroupsLegacy from './legacy';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Admin - Subgroups',
    description: 'Cohorts, chapters & special programs.',
    path: '/admin/subgroups',
  });
}

/** Cap the lean directory so first paint stays cheap. */
const DIRECTORY_LIMIT = 60;

/**
 * Focus line for "{N} members · {focus}". Prefers a real description, then the
 * linked partner name (partner-type subgroups), and falls back to the type.
 */
function focusLine(args: {
  description: string | null;
  partnerName: string | null;
  type: SubgroupKind;
}): string {
  const desc = args.description?.trim();
  if (desc) return desc;
  if (args.partnerName?.trim()) return args.partnerName.trim();
  if (args.type === 'church') return 'Church chapter';
  if (args.type === 'manager') return 'Managed cohort';
  return 'Partner group';
}

export default async function AdminSubgroupsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/subgroups');

  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const requestedUi = typeof params.ui === 'string' ? params.ui : null;

  // Legacy escape hatch → the prior table/card workspace.
  if (requestedUi === 'legacy') {
    return <AdminSubgroupsLegacy />;
  }

  // --- DEFAULT: real (lean) subgroup directory wired into the design kit ---

  const leaderOrg = inheritLeaderOrg(scope);
  const [subgroupsResult, totalResult, memberAggResult] = await withAdminPageScope(scope, (db) => Promise.allSettled([
    db.subgroup.findMany({
      take: DIRECTORY_LIMIT,
      where: { ...leaderOrg },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        partner: { select: { name: true } },
        _count: { select: { members: true } },
      },
    }),
    db.subgroup.count({ where: { ...leaderOrg } }),
    // Total distinct member assignments across all subgroups (real aggregate).
    db.memberSubgroup.groupBy({ by: ['subgroupId'], _count: { _all: true } }),
  ]));

  // If the core directory query fails, fall back to the proven legacy view
  // rather than rendering a fabricated/empty kit.
  if (subgroupsResult.status === 'rejected') {
    console.error('[admin/subgroups] directory load failed', subgroupsResult.reason);
    return <AdminSubgroupsLegacy />;
  }

  const rows = subgroupsResult.value;
  const totalSubgroups = totalResult.status === 'fulfilled' ? totalResult.value : rows.length;

  const totalMembers =
    memberAggResult.status === 'fulfilled'
      ? memberAggResult.value.reduce((sum, g) => sum + g._count._all, 0)
      : rows.reduce((sum, r) => sum + r._count.members, 0);

  const subgroups: SubgroupCard[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    members: r._count.members,
    focus: focusLine({
      description: r.description,
      partnerName: r.partner?.name ?? null,
      type: r.type as SubgroupKind,
    }),
    kind: r.type as SubgroupKind,
  }));

  return (
    <DesignSurface surface="dense">
      <SubgroupsDirectoryKit
        subgroups={subgroups}
        totalSubgroups={totalSubgroups}
        totalMembers={totalMembers}
      />
    </DesignSurface>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import { PROGRAMS } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';
import { LOOKUP_LIST_CAP } from '@/lib/db/queryCaps';
import AddMemberWizard from './AddMemberWizard';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Add Member',
  description: 'Create a new member account.',
  path: '/admin/members',
});
}

export default async function AddMemberPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members/new');

  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const leaderOrg = inheritLeaderOrg(scope);
  const [partners, subgroups] = await withAdminPageScope(scope, (db) => Promise.all([
    db.partner.findMany({
      take: LOOKUP_LIST_CAP,
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.subgroup.findMany({
      take: LOOKUP_LIST_CAP,
      where: { ...leaderOrg },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true },
    }),
  ]));

  return (
    <div className="add-member-page">
      <PageHeader
        breadcrumbs={[{ label: 'Members', href: '/admin/members' }, { label: 'New Member' }]}
        title="Add Member"
        subtitle="Multi-step onboarding. All WIOA fields required for grant reporting. Partner and subgroup pickers show the first 500 rows."
      />
      <AddMemberWizard programs={PROGRAMS} partners={partners} subgroups={subgroups} />
    </div>
  );
}

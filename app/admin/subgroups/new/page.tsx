import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope } from '@/lib/tenant/adminPageScope';
import { prisma } from '@/lib/db/prisma';
import { LOOKUP_LIST_CAP } from '@/lib/db/queryCaps';
import SubgroupForm from '@/components/admin/SubgroupForm';
import { buildPageMetadataAsync } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Create Subgroup',
  description: 'Create a new subgroup for partner, manager, or church visibility.',
  path: '/admin/subgroups',
});
}

export default async function NewSubgroupPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/subgroups/new');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');
  const [users, partners] = await Promise.all([
    withAdminPageScope(scope, (db) => db.user.findMany({
      take: LOOKUP_LIST_CAP,
      where: { deletedAt: null },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    })),
    withAdminPageScope(scope, (db) => db.partner.findMany({
      take: LOOKUP_LIST_CAP,
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })),
  ]);

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/subgroups" style={{ color: 'var(--color-on-surface-variant)', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Subgroups
        </Link>
      </div>
      <PageHeader title="Create Subgroup" subtitle="Subgroups let partners, managers, and churches see members assigned to their group. Link a partner for auto-assignment when members are referred." />
      <SubgroupForm users={users} partners={partners} />
    </div>
  );
}

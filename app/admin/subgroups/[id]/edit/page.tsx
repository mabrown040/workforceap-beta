import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritLeaderOrg } from '@/lib/tenant/adminPageScope';
import { prisma } from '@/lib/db/prisma';
import SubgroupForm from '@/components/admin/SubgroupForm';
import { buildPageMetadataAsync } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Edit Subgroup',
  description: 'Edit subgroup details.',
  path: '/admin/subgroups',
});
}

type Props = { params: Promise<{ id: string }> };

export default async function EditSubgroupPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/subgroups');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const [subgroup, users, partners] = await Promise.all([
    withAdminPageScope(scope, (db) => db.subgroup.findFirst({
      where: { id, ...inheritLeaderOrg(scope) },
      select: { id: true, name: true, type: true, leaderId: true, partnerId: true, description: true },
    })),
    withAdminPageScope(scope, (db) => db.user.findMany({
      take: 5000,
      where: { deletedAt: null },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    })),
    withAdminPageScope(scope, (db) => db.partner.findMany({
      take: 5000,
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })),
  ]);

  if (!subgroup) notFound();

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link href={`/admin/subgroups/${id}`} style={{ color: 'var(--color-on-surface-variant)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to {subgroup.name}
      </Link>
      <PageHeader title="Edit Subgroup" />
      <SubgroupForm users={users} partners={partners} subgroup={subgroup} />
    </div>
  );
}

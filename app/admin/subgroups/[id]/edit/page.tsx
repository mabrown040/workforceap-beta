import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { LOOKUP_LIST_CAP } from '@/lib/db/queryCaps';

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

  const [subgroup, users, partners] = await Promise.all([
    prisma.subgroup.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, leaderId: true, partnerId: true, description: true },
    }),
    prisma.user.findMany({
      take: LOOKUP_LIST_CAP,
      where: { deletedAt: null },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.partner.findMany({
      take: LOOKUP_LIST_CAP,
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
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

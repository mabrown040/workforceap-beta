import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import SubgroupForm from '@/components/admin/SubgroupForm';
import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Edit Subgroup',
  description: 'Edit subgroup details.',
  path: '/admin/subgroups',
});

type Props = { params: Promise<{ id: string }> };

export default async function EditSubgroupPage({ params }: Props) {
  const { id } = await params;

  const [subgroup, users, partners] = await Promise.all([
    prisma.subgroup.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, leaderId: true, partnerId: true, description: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.partner.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!subgroup) notFound();

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link href={`/admin/subgroups/${id}`} style={{ color: 'var(--color-gray-600)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to {subgroup.name}
      </Link>
      <PageHeader title="Edit Subgroup" />
      <SubgroupForm users={users} partners={partners} subgroup={subgroup} />
    </div>
  );
}

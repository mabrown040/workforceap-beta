import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import SubgroupForm from '@/components/admin/SubgroupForm';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create Subgroup',
  description: 'Create a new subgroup for partner, manager, or church visibility.',
  path: '/admin/subgroups',
});

export default async function NewSubgroupPage() {
  const [users, partners] = await Promise.all([
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

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/subgroups" style={{ color: 'var(--color-gray-600)', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Subgroups
        </Link>
      </div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Create Subgroup</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Subgroups let partners, managers, and churches see members assigned to their group. Link a partner for auto-assignment when members are referred.
      </p>
      <SubgroupForm users={users} partners={partners} />
    </div>
  );
}

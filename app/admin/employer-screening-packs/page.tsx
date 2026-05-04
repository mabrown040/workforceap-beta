import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { PROGRAMS } from '@/lib/content/programs';
import EmployerScreeningPacksAdmin from './EmployerScreeningPacksAdmin';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Employer screening packs',
  description: 'Attach employer-designed screening questions to a program for member end-of-training completion.',
  path: '/admin/employer-screening-packs',
});

export const dynamic = 'force-dynamic';

export default async function EmployerScreeningPacksPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/employer-screening-packs');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const packs = await prisma.employerScreeningPack.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 });

  return (
    <PortalPageFrame>
      <PageHeader
        title="Employer screening packs"
        subtitle="Members see the active pack for their enrolled program on Path to certification → Employer screening when they are near completion."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Employer screening' },
        ]}
      />
      <p style={{ maxWidth: 720, fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
        Questions are stored as JSON. See{' '}
        <Link href="/admin/career-mappings" style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
          Career paths
        </Link>{' '}
        for O*NET mappings. One active pack per program is recommended — deactivate older rows when publishing a new version.
      </p>
      <EmployerScreeningPacksAdmin initialPacks={packs} programOptions={PROGRAMS.map((p) => ({ slug: p.slug, title: p.title }))} />
    </PortalPageFrame>
  );
}

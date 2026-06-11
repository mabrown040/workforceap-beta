import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import PartnersTableClient from '@/components/admin/PartnersTableClient';
import PageHeader from '@/components/portal/PageHeader';

import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin - Partners',
  description: 'Manage partner organizations.',
  path: '/admin/partners',
});
}

async function loadAdminPartnersData() {
  return Promise.all([
    prisma.partner.findMany({
      take: 5000,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        active: true,
        status: true,
        notes: true,
        logoUrl: true,
        brandColor: true,
        _count: {
          select: {
            counselors: true,
            referrals: true,
          },
        },
      },
    }),
    prisma.subgroup.findMany({
      take: 5000,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, partnerId: true },
    }),
  ] as const);
}

type PartnersPayload = Awaited<ReturnType<typeof loadAdminPartnersData>>;

export default async function AdminPartnersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/partners');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const superAdmin = await isSuperAdmin(user.id);

  let partners: PartnersPayload[0];
  let subgroups: PartnersPayload[1];
  let loadError: string | null = null;

  try {
    ;[partners, subgroups] = await loadAdminPartnersData();
  } catch (e) {
    console.error('[admin/partners] load failed', e);
    loadError =
      e instanceof Error
        ? e.message
        : 'Database error while loading partners. If this persists after deploy, run pending Prisma migrations (e.g. referral_code on partners).';
    partners = [] as PartnersPayload[0];
    subgroups = [] as PartnersPayload[1];
  }

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        title="Partner Organizations"
        action={
          <Link
            href="/admin/partners/new"
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--color-accent)',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Add Partner
          </Link>
        }
      />

      {loadError ? (
        <div
          className="admin-empty-state"
          style={{ borderColor: 'rgba(185, 28, 28, 0.35)', background: 'rgba(254, 242, 242, 0.6)' }}
          role="alert"
        >
          <h3>Could not load partners</h3>
          <p style={{ marginBottom: '0.75rem' }}>
            {loadError}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            Common fix: apply the latest database migration on your hosting environment, then refresh this page.
          </p>
        </div>
      ) : null}

      {!loadError && partners.length === 0 ? (
        <div className="admin-empty-state">
          <h3>No partner organizations yet</h3>
          <p>
            Partner organizations refer candidates to WorkforceAP. Each partner gets their own portal login, referral
            tracking, and milestone notifications for their members.
          </p>
          <Link href="/admin/partners/new" className="btn btn-primary">
            Add Partner
          </Link>
        </div>
      ) : !loadError ? (
        <PartnersTableClient partners={partners} subgroups={subgroups} superAdmin={superAdmin} />
      ) : null}
    </div>
  );
}

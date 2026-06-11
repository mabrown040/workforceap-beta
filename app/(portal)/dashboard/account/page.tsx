import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.account');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/dashboard/account',
  });
}

export default async function DashboardAccountPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/account');

  const t = await getTranslations('dashboard.account');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  const email = dbUser?.email ?? user.email ?? '';

  return (
    <>
      <div className="portal-main-content">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          breadcrumbs={[
            { href: '/dashboard', label: t('breadcrumbPortal') },
            { label: t('title') },
          ]}
        />

        <div style={{ maxWidth: '560px' }} className="content-card">
          <h2 className="portal-section-title">{t('emailHeading')}</h2>
          <p>{email}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            {t('emailChangeNote')}
          </p>

          <h2 className="portal-section-title" style={{ marginTop: '1.5rem' }}>{t('passwordHeading')}</h2>
          <p style={{ marginBottom: '0.5rem' }}>
            {t('passwordBody')}
          </p>
          <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="btn btn-outline">
            {t('resetPassword')}
          </Link>

          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            <Link href="/dashboard/profile">{t('backToProfile')}</Link>
          </p>
        </div>
      </div>    </>
  );
}

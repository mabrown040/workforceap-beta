import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHeader from '@/components/portal/PageHeader';
import BenefitsCliffClient from '@/components/portal/BenefitsCliffClient';
import { DesignSurface, StatusTag } from '@/components/portal/kit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('benefitsCliff');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/dashboard/ai-tools/benefits-cliff',
  });
}

export default async function BenefitsCliffPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/benefits-cliff');

  const t = await getTranslations('benefitsCliff');

  return (
    <DesignSurface surface="warm">
      <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>
        <div style={{ paddingBottom: '6rem' }}>
          <div
            style={{
              padding: '1rem 1rem 1.25rem',
              borderBottom: '1px solid var(--wa-border)',
              background: 'var(--wa-surface)',
            }}
          >
            <PageHeader
              title={t('title')}
              subtitle={t('subtitle')}
              breadcrumbs={[
                { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
                { label: t('title') },
              ]}
              action={<StatusTag tone="info">{t('betaTag')}</StatusTag>}
            />
          </div>

          <div style={{ padding: '1rem 1rem 2rem', maxWidth: 900, margin: '0 auto' }}>
            <BenefitsCliffClient />
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}

import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHeader from '@/components/portal/PageHeader';
import BenefitsCliffClient from '@/components/portal/BenefitsCliffClient';

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
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title={t('title')}
            subtitle={t('subtitle')}
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: t('title') },
            ]}
            action={
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  color: 'var(--color-accent)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('betaTag')}
              </span>
            }
          />
        </div>

        <div style={{ padding: '1rem 1rem 2rem', maxWidth: 900, margin: '0 auto' }}>
          <BenefitsCliffClient />
        </div>
      </div>
    </div>
  );
}

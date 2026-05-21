import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import ConversionThankYouPage from '@/components/marketing/ConversionThankYouPage';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.thankYou.apply');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/apply/thank-you',
    robots: { index: false, follow: false },
  });
}

export default async function ApplyThankYouPage() {
  const t = await getTranslations('marketing.thankYou.apply');

  return (
    <ConversionThankYouPage
      funnel="apply"
      title={t('title')}
      lead={t('lead')}
      bullets={[
        { title: t('bullet1Title'), description: t('bullet1Desc') },
        { title: t('bullet2Title'), description: t('bullet2Desc') },
        { title: t('bullet3Title'), description: t('bullet3Desc') },
      ]}
      ctas={[
        { label: t('ctaDashboard'), href: '/dashboard', variant: 'primary' },
        { label: t('ctaPrograms'), href: '/programs', variant: 'outline' },
        { label: t('ctaHome'), href: '/', variant: 'muted' },
      ]}
    />
  );
}

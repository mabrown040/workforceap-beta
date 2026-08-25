import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import ConversionThankYouPage from '@/components/marketing/ConversionThankYouPage';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.thankYou.employer');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/employer/thank-you',
    robots: { index: false, follow: false },
  });
}

export default async function EmployerThankYouPage() {
  const t = await getTranslations('marketing.thankYou.employer');

  return (
    <ConversionThankYouPage
      funnel="employer"
      title={t('title')}
      lead={t('lead')}
      resource={{ label: t('resourceLabel'), href: '/impact' }}
      ctas={[
        { label: t('ctaEmployers'), href: '/employers', variant: 'outline' },
        { label: t('ctaHome'), href: '/', variant: 'muted' },
      ]}
    />
  );
}

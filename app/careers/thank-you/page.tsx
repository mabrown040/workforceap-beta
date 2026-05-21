import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import ConversionThankYouPage from '@/components/marketing/ConversionThankYouPage';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.thankYou.careers');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/careers/thank-you',
    robots: { index: false, follow: false },
  });
}

export default async function CareersThankYouPage() {
  const t = await getTranslations('marketing.thankYou.careers');

  return (
    <ConversionThankYouPage
      funnel="careers"
      title={t('title')}
      lead={t('lead')}
      bullets={[
        { title: t('bullet1Title'), description: t('bullet1Desc') },
        { title: t('bullet2Title'), description: t('bullet2Desc') },
        { title: t('bullet3Title'), description: t('bullet3Desc') },
      ]}
      ctas={[
        { label: t('ctaCareers'), href: '/careers', variant: 'outline' },
        { label: t('ctaHome'), href: '/', variant: 'muted' },
      ]}
    />
  );
}

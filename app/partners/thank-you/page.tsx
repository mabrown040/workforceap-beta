import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import ConversionThankYouPage from '@/components/marketing/ConversionThankYouPage';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.thankYou.partners');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/partners/thank-you',
    robots: { index: false, follow: false },
  });
}

export default async function PartnersThankYouPage() {
  const t = await getTranslations('marketing.thankYou.partners');

  return (
    <ConversionThankYouPage
      funnel="partners"
      title={t('title')}
      lead={t('lead')}
      bullets={[
        { title: t('bullet1Title'), description: t('bullet1Desc') },
        { title: t('bullet2Title'), description: t('bullet2Desc') },
        { title: t('bullet3Title'), description: t('bullet3Desc') },
      ]}
      resource={{ label: t('resourceLabel'), href: '/partner-resources/partner-referral-flyer.html', external: true }}
      ctas={[
        { label: t('ctaPortal'), href: '/partner', variant: 'primary' },
        { label: t('ctaPartners'), href: '/partners', variant: 'outline' },
        { label: t('ctaHome'), href: '/', variant: 'muted' },
      ]}
    />
  );
}

import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { BenefitsCliffKit } from '@/components/portal/kit/pages/member/BenefitsCliffKit';

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
    <BenefitsCliffKit
      title={t('title')}
      lede={t('subtitle')}
      betaLabel={t('betaTag')}
    />
  );
}

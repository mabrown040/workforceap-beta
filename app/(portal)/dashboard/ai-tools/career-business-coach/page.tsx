import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { CareerBusinessCoachKit } from '@/components/portal/kit/pages/member/CareerBusinessCoachKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('careerBusinessCoachMetaTitle'),
    description: t('careerBusinessCoachMetaDesc'),
    path: '/dashboard/ai-tools/career-business-coach',
  });
}

export default async function CareerBusinessCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/career-business-coach');

  return <CareerBusinessCoachKit />;
}

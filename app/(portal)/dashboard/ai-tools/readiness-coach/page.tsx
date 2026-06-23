import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('readinessCoachMetaTitle'),
    description: t('readinessCoachMetaDesc'),
    path: '/dashboard/ai-tools/readiness-coach',
  });
}

export default async function ReadinessCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/readiness-coach');

  redirect('/dashboard/ai-tools/studio?tab=session&agent=readiness');
}

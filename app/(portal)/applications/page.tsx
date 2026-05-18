import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('applications');
  return buildPageMetadataAsync({
    title: t('applicationsMetaTitle'),
    description: t('applicationsMetaDesc'),
    path: '/applications',
  });
}

export default async function ApplicationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/job-applications');
  redirect('/dashboard/job-applications');
}

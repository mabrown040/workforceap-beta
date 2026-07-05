import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { LinkedInHeadlineKit } from '@/components/portal/kit/pages/member/LinkedInHeadlineKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('linkedinHeadlineMetaTitle'),
    description: t('linkedinHeadlineMetaDesc'),
    path: '/dashboard/ai-tools/linkedin-headline',
  });
}

export default async function LinkedInHeadlinePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/linkedin-headline');

  return <LinkedInHeadlineKit userId={user.id} />;
}

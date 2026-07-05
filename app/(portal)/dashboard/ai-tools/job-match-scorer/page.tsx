import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { JobMatchScorerKit } from '@/components/portal/kit/pages/member/JobMatchScorerKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('jobMatchScorerMetaTitle'),
    description: t('jobMatchScorerMetaDesc'),
    path: '/dashboard/ai-tools/job-match-scorer',
  });
}

export default async function JobMatchScorerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/job-match-scorer');

  return <JobMatchScorerKit userId={user.id} />;
}

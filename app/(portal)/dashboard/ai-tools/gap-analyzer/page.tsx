import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { GapAnalyzerKit } from '@/components/portal/kit/pages/member/GapAnalyzerKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('gapAnalyzerMetaTitle'),
    description: t('gapAnalyzerMetaDesc'),
    path: '/dashboard/ai-tools/gap-analyzer',
  });
}

export default async function GapAnalyzerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/gap-analyzer');

  return <GapAnalyzerKit userId={user.id} />;
}

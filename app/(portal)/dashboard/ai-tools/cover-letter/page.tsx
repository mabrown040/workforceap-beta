import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { CoverLetterKit } from '@/components/portal/kit/pages/member/CoverLetterKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('coverLetterMetaTitle'),
    description: t('coverLetterMetaDesc'),
    path: '/dashboard/ai-tools/cover-letter',
  });
}

export default async function CoverLetterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/cover-letter');

  return <CoverLetterKit userId={user.id} />;
}

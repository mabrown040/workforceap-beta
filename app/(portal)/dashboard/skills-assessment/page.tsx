import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('aiToolkit'),
    description: t('aiToolkitDescription'),
    path: '/dashboard/ai-tools',
  });
}

export default function SkillsAssessmentRedirectPage() {
  redirect('/dashboard/ai-tools?toast=Skills+Assessment+has+moved+to+the+AI+Toolkit');
}

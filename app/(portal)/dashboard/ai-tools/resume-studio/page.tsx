import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ResumeStudioKit } from '@/components/portal/kit/pages/member/ResumeStudioKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('resumeStudio');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/dashboard/ai-tools/resume-studio',
  });
}

export default async function ResumeStudioPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/resume-studio');

  const t = await getTranslations('resumeStudio');

  let hasResume = false;
  try {
    const plain = await getMemberResumePlainText(user.id, 200);
    hasResume = plain.trim().length > 0;
  } catch (err) {
    console.error('[resume-studio page] resume check failed', err);
  }

  return (
    <Suspense fallback={null}>
      <ResumeStudioKit
        hasResume={hasResume}
        scoreHistorySlot={<ToolHistoryPanel userId={user.id} toolType="resume_analysis" />}
        rewriteHistorySlot={
          <ToolHistoryPanel userId={user.id} toolType="resume_rewriter" title={t('rewriteHistoryTitle')} />
        }
      />
    </Suspense>
  );
}

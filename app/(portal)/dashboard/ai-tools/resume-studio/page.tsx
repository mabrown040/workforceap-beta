import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import ResumeStudioClient from '@/components/portal/ResumeStudioClient';

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
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title={t('title')}
            subtitle={t('subtitle')}
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: t('title') },
            ]}
            action={
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(173,44,77,0.12)',
                  color: 'var(--color-accent)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('betaTag')}
              </span>
            }
          />
        </div>

        <div style={{ padding: '1rem 1rem 2rem', maxWidth: 1120, margin: '0 auto' }}>
          <Suspense fallback={null}>
            <ResumeStudioClient
              hasResume={hasResume}
              scoreHistorySlot={<ToolHistoryPanel userId={user.id} toolType="resume_analysis" />}
              rewriteHistorySlot={
                <ToolHistoryPanel userId={user.id} toolType="resume_rewriter" title={t('rewriteHistoryTitle')} />
              }
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

import { getTranslations } from 'next-intl/server';
import { getUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import InterviewPrepBundle from '@/components/portal/InterviewPrepBundle';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('interviewPrepMetaTitle'),
    description: t('interviewPrepMetaDesc'),
    path: '/dashboard/ai-tools/interview-prep',
  });
};

export default async function InterviewPrepBundlePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/interview-prep');

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div style={{ padding: '1.25rem 2rem 1.5rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
        <PageHeader
          title="WIOA Interview Prep"
          subtitle="Prepare for your WIOA program interview and upcoming job interviews — everything you have built with our AI tools, pulled together for quick review. Email it to yourself or copy it out."
          breadcrumbs={[
            { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'WIOA Interview Prep' },
          ]}
        />
      </div>
      <div style={{ paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>
          <Suspense
            fallback={
              <div style={{ padding: '2rem 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                Building your bundle…
              </div>
            }
          >
            <InterviewPrepBundle />
          </Suspense>
        </div>      </div>
    </div>
  );
}

import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import GapAnalyzerForm from '@/components/portal/tools/GapAnalyzerForm';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

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

  return (
    <>
      <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1.25rem 2rem 1.5rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title="Resume Gap Analyzer"
            subtitle="Upload your resume. We flag employment gaps and suggest framing language for cover letters and interviews so you can address them confidently."
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Resume Gap Analyzer' },
            ]}
          />
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12 }}>
            <GapAnalyzerForm />
          </div>

          <ToolHistoryPanel userId={user.id} toolType="gap_analyzer" />
        </div>      </div>
      </div>
    </>
  );
}
